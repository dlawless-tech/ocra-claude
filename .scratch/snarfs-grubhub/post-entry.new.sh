#!/bin/bash
# Fill, save, verify and approve one Snarf's Grubhub journal entry.
#
# Usage: ENTRY_DATE=9/6/2026 post-entry.sh <session> <r365-location> [work-json]
#   work-json defaults to $SNARFS_GRUBHUB_WORK, else ./work.json
#   ENTRY_DATE is the entry date as R365 renders it, and is required. Snarf's
#   Grubhub period runs Tue-Mon, so this is the Sunday inside the period.
#   r365-location is a substring of the entry's location cell: the store
#   name after the dash (MX, SLU, Skinker, Page, Fenton, Kirkwood).
#
# The work json is an array of objects keyed by that location fragment:
#   {loc, id, tot, lines: [{comment, col, amount}, ...]}
#   id is the TransactionId; see ../bowery-ubereats/R365-AUTOMATION.md.
#   comment must match the template line's Comment cell verbatim (or its full
#   account, for a template without comments like Spirit's), col is
#   "debit" or "credit". Each line ends up holding only its amount; the other
#   column is cleared, so a refill overwrites what an earlier run left.
#
# An Approved entry is unapproved first, whatever it holds.
# Refuses to approve unless three checks pass: every typed amount reads back,
# the lines sum to tot on both sides, and the values survive a reload.
set -u
S="$1"; LOC="$2"
[ -n "${ENTRY_DATE:-}" ] || { echo "$2 FAIL: ENTRY_DATE not set"; exit 1; }
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="${3:-${SNARFS_GRUBHUB_WORK:-./work.json}}"
[ -f "$WORK" ] || { echo "$LOC FAIL: no work json at $WORK"; exit 1; }
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
J() { node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const r=d.find(x=>x.loc===process.argv[2]);const v=r[process.argv[3]];process.stdout.write(typeof v==="number"?v.toFixed(2):String(v));' "$WORK" "$LOC" "$1"; }
# one "comment<TAB>col<TAB>amount" line per entry line
LINES() { node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const r=d.find(x=>x.loc===process.argv[2]);for(const l of r.lines)process.stdout.write(l.comment+"\t"+l.col+"\t"+Number(l.amount).toFixed(2)+"\n");' "$WORK" "$LOC"; }
die() { echo "$LOC FAIL: $*"; exit 1; }
n2() { local x; x=$(echo "$1" | sed -e "s/,//g" -e "s/\"//g"); printf "%.2f" "$x" 2>/dev/null || echo "$1"; }
# comment text -> a single-quoted JS string literal, safe to paste into an eval
# quotes become \x22 / \x27 so the literal survives bash, the CLI arg, and JS
# no backslash in this source: Windows argv rules mangle them on the way to node
jsq() { node -e 'const B=String.fromCharCode(92),Q=String.fromCharCode(39),D=String.fromCharCode(34);process.stdout.write(Q+JSON.stringify(process.argv[1]).slice(1,-1).split(B+D).join(B+"x22").split(Q).join(B+"x27")+Q)' "$1"; }

ID=$(J id); [ -z "$ID" ] && die "no id"
COMMENTS=$(LINES | cut -f1)
[ -n "$COMMENTS" ] || die "work json carries no lines"

playwright-cli -s=$S goto "https://snarfsstl.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1
sleep 14

# template must already carry every comment we are about to key on
JSLIST=$(while IFS= read -r c; do printf "%s," "$(jsq "$c")"; done <<< "$COMMENTS")
CHK=$(playwright-cli -s=$S eval "() => { const want=[${JSLIST%,}]; const rows=Array.from(document.querySelectorAll('tr')).map(r=>Array.from(r.cells||[]).map(c=>c.innerText.trim())); const miss=want.filter(l=>!rows.some(t=>t.includes(l))); const dt=(document.querySelector('input[name=journalEntryDate]')||{}).value; const loc=(rows.find(t=>t.includes(want[0]))||[]).join('|'); return {dt, miss, loc}; }" 2>&1 | res)
case "$CHK" in *'"miss": []'*) : ;; *) die "template missing comments: $CHK";; esac
case "$CHK" in *"$ENTRY_DATE"*) : ;; *) die "wrong date: want $ENTRY_DATE got $CHK";; esac
case "$CHK" in *"$LOC"*) : ;; *) die "wrong location: want $LOC got $CHK";; esac

# Approved -> unapprove, then refill with this run's figures
ST=$(playwright-cli -s=$S eval "() => (document.body.innerText.match(/Unapproved|Approved/)||['?'])[0]" 2>&1 | res | tr -d '"')
if [ "$ST" = "Approved" ]; then
  PRIOR=$(playwright-cli -s=$S eval "() => { const L=[${JSLIST%,}]; const rows=Array.from(document.querySelectorAll('tr')).map(r=>Array.from(r.cells||[]).map(c=>c.innerText.trim())); return L.map(l=>{const r=rows.find(t=>t.includes(l)); return r?r[3]+'/'+r[4]:'?';}).join(' | '); }" 2>&1 | res | tr -d '"')
  bash "$HERE/ribbon-menu.sh" $S Unapprove Unapprove >/dev/null 2>&1; sleep 10
  ST=$(playwright-cli -s=$S eval "() => (document.body.innerText.match(/Unapproved|Approved/)||['?'])[0]" 2>&1 | res | tr -d '"')
  [ "$ST" = "Unapproved" ] || die "could not unapprove ($ST)"
  echo "$LOC unapproved, prior lines: $PRIOR"
  playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14
fi

# one real click wakes the grid editor; scripted clicks alone are ignored.
# the a11y snapshot sometimes races page render, so retry and reload before giving up.
WREF=""
for attempt in 1 2 3; do
  TMP=$(mktemp); bash "$HERE/snapshot.sh" $S $TMP
  while IFS= read -r c; do
    LN=$(grep -n "gridcell \"$c\"" $TMP | head -1 | cut -d: -f1)
    if [ -n "${LN:-}" ]; then
      WREF=$(sed -n "$((LN-1))p" $TMP | grep -oE "ref=[a-zA-Z0-9]+" | head -1 | cut -d= -f2)
      [ -n "$WREF" ] && break
    fi
  done <<< "$COMMENTS"
  rm -f $TMP
  [ -n "${WREF:-}" ] && break
  if [ $attempt -eq 2 ]; then playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14; else sleep 6; fi
done
[ -z "${WREF:-}" ] && die "wake: grid never appeared in snapshot after 3 tries"
playwright-cli -s=$S click $WREF >/dev/null 2>&1
sleep 2
playwright-cli -s=$S press Escape >/dev/null 2>&1
sleep 1

setcell() { # comment col amount; leaves the cell alone when it already holds the amount
  local L C A R V
  L="$(jsq "$1")"; C="$2"; A="$3"
  V=$(playwright-cli -s=$S eval "() => { const rows=Array.from(document.querySelectorAll('tr')); const r=rows.find(x=>Array.from(x.cells||[]).some(c=>c.innerText.trim()===$L)); if(!r) return 'ERR-norow'; const cells=Array.from(r.cells); const i=cells.findLastIndex(c=>c.innerText.trim()===$L); return cells[i+(/^[0-9]{5} - /.test($L)?('$C'==='debit'?1:2):('$C'==='debit'?-2:-1))].innerText.trim(); }" 2>&1 | res)
  case "$V" in *ERR-norow*) die "no row for $1";; esac
  [ "$(n2 "${V:-0}")" = "$(n2 "$A")" ] && return 0
  R=$(playwright-cli -s=$S eval "() => { const rows=Array.from(document.querySelectorAll('tr')); const r=rows.find(x=>Array.from(x.cells||[]).some(c=>c.innerText.trim()===$L)); if(!r) return 'ERR-norow'; const cells=Array.from(r.cells); const i=cells.findLastIndex(c=>c.innerText.trim()===$L); cells[i+(/^[0-9]{5} - /.test($L)?('$C'==='debit'?1:2):('$C'==='debit'?-2:-1))].click(); return 'ok'; }" 2>&1 | res)
  case "$R" in *ok*) : ;; *) die "click $1/$C -> $R";; esac
  sleep 2
  playwright-cli -s=$S fill "input[name=\"$C\"]" "$A" >/dev/null 2>&1
  playwright-cli -s=$S press Tab >/dev/null 2>&1
  sleep 1
  playwright-cli -s=$S press Escape >/dev/null 2>&1
  sleep 1
  V=$(playwright-cli -s=$S eval "() => { const rows=Array.from(document.querySelectorAll('tr')); const r=rows.find(x=>Array.from(x.cells||[]).some(c=>c.innerText.trim()===$L)); const cells=Array.from(r.cells); const i=cells.findLastIndex(c=>c.innerText.trim()===$L); return cells[i+(/^[0-9]{5} - /.test($L)?('$C'==='debit'?1:2):('$C'==='debit'?-2:-1))].innerText.trim(); }" 2>&1 | res)
  [ "$(n2 "${V:-0}")" = "$(n2 "$A")" ] || die "$1/$C read back '$V' want '$A'"
}
fill() { # comment col amount
  setcell "$1" "$2" "$3"
  setcell "$1" "$([ "$2" = debit ] && echo credit || echo debit)" 0.00
}

while IFS=$'\t' read -r c col amt; do
  [ -n "$c" ] && fill "$c" "$col" "$amt"
done <<< "$(LINES)"

WANT=$(J tot)
TOT=$(playwright-cli -s=$S eval "() => { const L=[${JSLIST%,}]; const rows=Array.from(document.querySelectorAll('tr')).map(r=>Array.from(r.cells||[]).map(c=>c.innerText.trim())); let dr=0,cr=0; for(const l of L){ const t=rows.find(x=>x.includes(l)); if(!t) return 'MISSING:'+l; dr+=parseFloat((t[3]||'0').replace(/,/g,''))||0; cr+=parseFloat((t[4]||'0').replace(/,/g,''))||0; } return dr.toFixed(2)+'/'+cr.toFixed(2); }" 2>&1 | res | tr -d '"')
echo "$LOC pre-save totals: $TOT (want $WANT/$WANT)"
[ "$TOT" = "$WANT/$WANT" ] || die "totals mismatch $TOT want $WANT/$WANT"

bash "$HERE/ribbon-menu.sh" $S Save "Save" >/dev/null 2>&1
sleep 12
playwright-cli -s=$S reload >/dev/null 2>&1
sleep 14
VER=$(playwright-cli -s=$S eval "() => { const L=[${JSLIST%,}]; const rows=Array.from(document.querySelectorAll('tr')).map(r=>Array.from(r.cells||[]).map(c=>c.innerText.trim())); return L.map(l=>{const r=rows.find(t=>t.includes(l)); return r?r[3]+'/'+r[4]:'?';}).join(' | '); }" 2>&1 | res | tr -d '"')
echo "$LOC after-save: $VER"
case "$VER" in *'?'*) die "line vanished after reload: $VER";; esac
[ "$WANT" = "0.00" ] || case "$VER" in *[1-9]*) : ;; *) die "save did not land";; esac

# Approve and Close does nothing in this instance; plain Approve takes
bash "$HERE/ribbon-menu.sh" $S Approve "Approve" >/dev/null 2>&1
sleep 10
ST=$(playwright-cli -s=$S eval "() => (document.body.innerText.match(/Unapproved|Approved/)||['?'])[0]" 2>&1 | res | tr -d '"')
[ "$ST" = "Approved" ] || die "saved but did not approve ($ST)"
echo "$LOC DONE"

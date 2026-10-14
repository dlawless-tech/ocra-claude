#!/bin/bash
# Correct one Approved UberEats journal entry in place: unapprove, set every
# named line to the work-json figures, save, reload, approve.
#
# Usage: ENTRY_DATE=9/27/2026 fix-entry.sh <session> <r365-location> [work-json]
#   Same work json as post-entry.sh: {loc, id, arCredit, fees, mkt, diffDr, diffCr, tot}
#   The marketing line must already exist when mkt is nonzero; an entry
#   missing it goes through post-entry.sh with FORCE=1 instead.
# Refuses to approve unless every line reads back, the lines sum to tot on
# both sides, and the values survive a reload.
set -u
S="$1"; LOC="$2"
[ -n "${ENTRY_DATE:-}" ] || { echo "$LOC FAIL: ENTRY_DATE not set"; exit 1; }
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="${3:-${BOWERY_UBEREATS_WORK:-./work.json}}"
[ -f "$WORK" ] || { echo "$LOC FAIL: no work json at $WORK"; exit 1; }
AR="a/r debit from prior week less total payout"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
J() { node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const r=d.find(x=>x.loc===process.argv[2]);const v=r[process.argv[3]]??0;process.stdout.write(typeof v==="number"?v.toFixed(2):String(v));' "$WORK" "$LOC" "$1"; }
die() { echo "$LOC FAIL: $*"; exit 1; }
ID=$(J id); [ -z "$ID" ] && die "no id"
MKT=$(J mkt); TOT=$(J tot)

playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 14
HDR=$(playwright-cli -s=$S eval "() => [location.hostname, document.querySelector('input[name=journalEntryDate]')?.value, document.querySelector('[name=journalEntryLocation_input]')?.value, (document.body.innerText.match(/Unapproved|Approved/)||['?'])[0]].join('|')" 2>&1 | res)
case "$HDR" in bowerygroup.restaurant365.com\|"$ENTRY_DATE"\|*"$LOC"*) : ;; *) die "wrong entry or logged out: $HDR";; esac
if [ "${HDR##*|}" = "Approved" ]; then
  bash "$HERE/ribbon-menu.sh" $S Unapprove Unapprove >/dev/null 2>&1; sleep 10
fi
ST=$(playwright-cli -s=$S eval "() => (document.body.innerText.match(/Unapproved|Approved/)||['?'])[0]" 2>&1 | res)
[ "$ST" = "Unapproved" ] || die "could not unapprove ($ST)"

# one real click wakes the grid editor
TMP=$(mktemp); bash "$HERE/snapshot.sh" $S $TMP
LN=$(grep -n 'gridcell "uber fees"' $TMP | head -1 | cut -d: -f1); [ -n "$LN" ] || die "grid not in snapshot (entry left Unapproved)"
W=$(sed -n "$((LN-1))p" $TMP | grep -oE 'ref=[a-zA-Z0-9]+' | head -1 | cut -d= -f2); rm -f $TMP
playwright-cli -s=$S click $W >/dev/null 2>&1; sleep 2; playwright-cli -s=$S press Escape >/dev/null 2>&1; sleep 1

fill() { # label debit|credit amount ; always writes, so a stale value gets zeroed
  R=$(playwright-cli -s=$S eval "() => { const r=Array.from(document.querySelectorAll('tr')).find(x=>Array.from(x.cells||[]).some(c=>c.innerText.trim()==='$1')); if(!r) return 'norow'; const c=Array.from(r.cells); const i=c.findIndex(x=>x.innerText.trim()==='$1'); c[i-('$2'==='debit'?2:1)].click(); return 'ok'; }" 2>&1 | res)
  [ "$R" = "ok" ] || die "click $1/$2 -> $R (entry left Unapproved)"; sleep 2
  playwright-cli -s=$S fill "input[name=\"$2\"]" "$3" >/dev/null 2>&1
  playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Escape >/dev/null 2>&1; sleep 1
}
fill "$AR" debit 0; fill "$AR" credit "$(J arCredit)"
fill "uber fees" credit 0; fill "uber fees" debit "$(J fees)"
fill "difference" debit "$(J diffDr)"; fill "difference" credit "$(J diffCr)"
LINES="'$AR','uber fees','difference'"
if [ "$MKT" != "0.00" ]; then LINES="$LINES,'marketing'"; fill "marketing" credit 0; fill "marketing" debit "$MKT"; fi

rows() { playwright-cli -s=$S eval "() => { const rows=Array.from(document.querySelectorAll('tr')).map(r=>Array.from(r.cells||[]).map(c=>c.innerText.trim())); let dr=0,cr=0,o=[]; for(const l of [$LINES]){ const t=rows.find(x=>x.includes(l)); if(!t) return 'MISSING '+l; const i=t.indexOf(l); const d=parseFloat(t[i-2].replace(/,/g,''))||0, c=parseFloat(t[i-1].replace(/,/g,''))||0; dr+=d; cr+=c; o.push(l.slice(0,5)+' '+d.toFixed(2)+'/'+c.toFixed(2)); } return o.join(' | ')+' || '+dr.toFixed(2)+'/'+cr.toFixed(2); }" 2>&1 | res; }
B=$(rows); echo "$LOC pre-save: $B"
case "$B" in *"a/r d 0.00/$(J arCredit)"*"uber  $(J fees)/0.00"*"diffe $(J diffDr)/$(J diffCr)"*"|| $TOT/$TOT") : ;; *) die "pre-save mismatch, want tot $TOT (entry left Unapproved, not saved)";; esac

bash "$HERE/ribbon-menu.sh" $S Save Save >/dev/null 2>&1; sleep 12
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14
A=$(rows); echo "$LOC after reload: $A"
[ "$A" = "$B" ] || die "save did not land (entry left Unapproved)"
bash "$HERE/ribbon-menu.sh" $S Approve "Approve and Close" >/dev/null 2>&1; sleep 14
echo "$LOC FIXED"

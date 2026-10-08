#!/bin/bash
# Post one store's Foodja Fees entry from plan.json: duplicate the source entry, date and number it,
# set the lines, save, check the save body, reload and read back, approve, attach the store's statement.
# usage: post-entry.sh <session> <plan.json> <code> <entry date M/D/YYYY> <statements dir> [source TransactionId]
# The source is the store's latest Foodja Fees entry (sources.js); without one it falls back to stores.json _source.
# Prints "<code> DONE <id> <amount>". A failure after Duplicate leaves an NJ-numbered copy; delete it.
set -u
S=$1; PLAN=$2; CODE=$3; DT=$4; SDIR=$5; SRC=${6:-}
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "$CODE FAIL: $*"; exit 1; }
pick() { node -e 'const p=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.code===process.argv[2]);if(p)console.log(p[process.argv[3]])' "$PLAN" "$CODE" "$1"; }
[ -n "$SRC" ] || SRC=$(node -e 'console.log(require(process.argv[1])._source)' "$HERE/stores.json")
TOT=$(node -e 'const p=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.code===process.argv[2]);if(p)console.log(p.amount.toFixed(2))' "$PLAN" "$CODE")
[ -n "$TOT" ] || die "not in plan"
FILE="$SDIR/$(pick file)"
[ -f "$FILE" ] || die "no statement $FILE"

if [ -n "${COPY:-}" ]; then
  # resume on an NJ copy a failed run left behind
  while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
  playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
  playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$COPY" >/dev/null 2>&1; sleep 14
else
  while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
  playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
  playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$SRC" >/dev/null 2>&1; sleep 13
  playwright-cli -s=$S click '#Action > a' >/dev/null 2>&1; sleep 1
  R=$(playwright-cli -s=$S eval "() => { const a=Array.from(document.querySelectorAll('#Action li')).find(x=>x.innerText.trim()==='Duplicate'); if(!a) return 'nodup'; a.querySelector('a').click(); return 'ok'; }" 2>&1 | res)
  case "$R" in *ok*) : ;; *) die "duplicate: $R";; esac
  sleep 3
  # source with attachments asks first; the old statement stays behind
  playwright-cli -s=$S click 'button:text-is("No, transaction only")' >/dev/null 2>&1
  sleep 13
  # the copy opens in a second tab, already saved as NJ..., dated today
  [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -ge 2 ] || die "no duplicate tab"
  playwright-cli -s=$S tab-select 1 >/dev/null 2>&1; sleep 4
fi
NEWID=$(playwright-cli -s=$S eval "() => location.hash.split('/').pop()" 2>&1 | res | tr -d '"')
echo "$CODE copy $NEWID"

playwright-cli -s=$S fill 'input[name="journalEntryDate"]' "$DT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill 'input[name="journalEntryNumber"]' "Foodja Fees" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
R=$(playwright-cli -s=$S eval "$(node "$HERE/set-lines.js" "$PLAN" "$CODE")" 2>&1 | res | sed 's/\\"/"/g')
case "$R" in *"\"dr\":\"$TOT\",\"cr\":\"$TOT\""*) : ;; *) die "set $R want $TOT";; esac

bash "$HERE/ribbon-menu.sh" $S Save "Save" >/dev/null 2>&1; sleep 12
N=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE "^[0-9]+")
B=$(playwright-cli -s=$S response-body $N 2>&1 | grep -E '^\[\[')
case "$B" in *"\"1\",\"$NEWID\""*) : ;; *) die "save body: $B";; esac
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14
V=$(playwright-cli -s=$S eval "$(cat "$HERE/read-model.js")" 2>&1 | res)
echo "$CODE readback $V"
# zero lines may be dropped on save, so a missing zero line passes
node -e 'const p=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.code===process.argv[2]);let v=JSON.parse(process.argv[3]);if(typeof v==="string")v=JSON.parse(v);if(v.date!==process.argv[4]||v.num!=="Foodja Fees"||v.hdr!==p.loc)process.exit(2);for(const l of p.lines){const r=v.rows.find(r=>r[0]===l.comment);const e=l.col==="debit"?[l.amount,0]:[0,l.amount];if(l.amount===0&&!r)continue;if(!r||Math.abs(r[1]-e[0])>0.005||Math.abs(r[2]-e[1])>0.005||r[3]!==l.account||r[4]!==p.loc)process.exit(3);}' "$PLAN" "$CODE" "$V" "$DT" || die "reload readback mismatch"

playwright-cli -s=$S click '#Approve > a' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click 'li[data-testid="approveMenuItem"]' >/dev/null 2>&1; sleep 10
N=$(playwright-cli -s=$S requests 2>&1 | grep "Transaction/Approve" | tail -1 | grep -oE "^[0-9]+")
A=$( [ -n "$N" ] && playwright-cli -s=$S response-body $N 2>&1 | grep -o '"message":"[^"]*","transactions":\[{"id":"[^"]*"')
case "$A" in *"Successfully Approved."*"$NEWID"*) : ;; *) die "approve response: $A";; esac
bash "$HERE/attach.sh" $S "$NEWID" "$FILE" || die "attach"
echo "$CODE DONE $NEWID $TOT"

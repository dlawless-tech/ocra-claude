#!/bin/bash
# Enter one store's EZ Cater Fees entry from entries.json, unapproved: duplicate the source entry, date and number it,
# set the lines, save, check the save body, reload and read back. Approval is a separate step (approve-entry.sh).
# usage: enter-entry.sh <session> <entries.json> <key "location|M/D/YYYY">
# EDIT=<id> rewrites that unapproved entry in place instead of duplicating the source.
# Prints "<location> SAVED <id> <amount>". A failure after Duplicate leaves an NJ-numbered copy; delete it.
set -u
S=$1; EN=$2; KEY=$3; LOC=$KEY; DT=${KEY#*|}
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "$LOC FAIL: $*"; exit 1; }
get() { node -e 'const e=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.key===process.argv[2]);if(e)console.log(e[process.argv[3]])' "$EN" "$LOC" "$1"; }
SRC=$(get source); TOT=$(node -e 'const e=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.key===process.argv[2]);if(e)console.log(e.amount.toFixed(2))' "$EN" "$LOC")
[ -n "$TOT" ] || die "not in entries"

while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
if [ -n "${EDIT:-}" ]; then
  playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$EDIT" >/dev/null 2>&1; sleep 14
  NEWID=$EDIT
else
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$SRC" >/dev/null 2>&1; sleep 13
playwright-cli -s=$S click '#Action > a' >/dev/null 2>&1; sleep 1
R=$(playwright-cli -s=$S eval "() => { const a=Array.from(document.querySelectorAll('#Action li')).find(x=>x.innerText.trim()==='Duplicate'); if(!a) return 'nodup'; a.querySelector('a').click(); return 'ok'; }" 2>&1 | res)
case "$R" in *ok*) : ;; *) die "duplicate: $R";; esac
sleep 3
playwright-cli -s=$S click 'button:text-is("No, transaction only")' >/dev/null 2>&1
sleep 13
[ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -ge 2 ] || die "no duplicate tab"
playwright-cli -s=$S tab-select 1 >/dev/null 2>&1; sleep 4
NEWID=$(playwright-cli -s=$S eval "() => location.hash.split('/').pop()" 2>&1 | res | tr -d '"')
fi
echo "$LOC copy $NEWID"

playwright-cli -s=$S fill 'input[name="journalEntryDate"]' "$DT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill 'input[name="journalEntryNumber"]' "EZ Cater Fees" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
R=$(playwright-cli -s=$S eval "$(node "$HERE/set-lines.js" "$EN" "$LOC")" 2>&1 | res | sed 's/\\"/"/g')
case "$R" in *"\"dr\":\"$TOT\",\"cr\":\"$TOT\""*) : ;; *) die "set $R want $TOT";; esac

bash "$HERE/ribbon-menu.sh" $S Save "Save" >/dev/null 2>&1; sleep 12
N=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE "^[0-9]+")
B=$(playwright-cli -s=$S response-body $N 2>&1 | grep -E '^\[\[')
case "$B" in *"\"1\",\"$NEWID\""*) : ;; *) die "save body: $B";; esac
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14
V=$(playwright-cli -s=$S eval "$(cat "$HERE/read-model.js")" 2>&1 | res)
echo "$LOC readback $V"
# zero lines may be dropped on save, so a missing zero line passes
node -e 'const e=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.key===process.argv[2]);let v=JSON.parse(process.argv[3]);if(typeof v==="string")v=JSON.parse(v);if(v.date!==process.argv[4]||v.num!=="EZ Cater Fees")process.exit(2);for(const l of e.lines){const r=v.rows.find(r=>r[3]===l.account[0]);if(!l.debit&&!l.credit&&!r)continue;if(!r||Math.abs(r[1]-l.debit)>0.005||Math.abs(r[2]-l.credit)>0.005||r[4]!==e.r365loc)process.exit(3);}' "$EN" "$LOC" "$V" "$DT" || die "reload readback mismatch"
echo "$LOC SAVED $NEWID $TOT"

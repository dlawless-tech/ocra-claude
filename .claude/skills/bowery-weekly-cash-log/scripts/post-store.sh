#!/bin/bash
# Build one store's entry from its prior week, attach its PDF, and check it. Does not approve.
# usage: post-store.sh <session> <lines.json> <store> <prior-week TransactionId> <pdf path> [number]
# Prints the new id, then the check-lines.js table. Exits nonzero on any step that does not land.
set -u
S="$1"; L="$2"; ST="$3"; SRC="$4"; PDF="$5"; NUM="${6:-Weekly Log - Deposits, Tips, Paid Outs}"
D=$(dirname "$0"); SK="$D/../.."
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
ev() { playwright-cli -s=$S eval "$(cat "$1")" 2>&1 | res; }
WE=$(node -e 'process.stdout.write(require(require("path").resolve(process.argv[1])).weekEnding)' "$L")

ID=$(bash "$D/duplicate.sh" $S "$SRC" "$WE" "$NUM") || { echo "$ID"; exit 1; }
echo "id $ID"

node "$D/set-lines.js" "$L" "$ST" > set.js
R=$(ev set.js)
if echo "$R" | grep -qE 'ADD|REMOVE'; then
  # removes by a real trash click; dataSource.remove never reaches the save
  for GL in $(echo "$R" | tr ';' '\n' | grep -oE 'REMOVE [a-z]+ \| [0-9]{3}-[0-9]{2}' | grep -oE '[0-9]{3}-[0-9]{2}'); do
    U=$(playwright-cli -s=$S eval "() => jQuery('[data-role=grid]').data('kendoGrid').dataSource.data().find(m => m.glAccount.indexOf('$GL') === 0).uid" 2>&1 | res | tr -d '"')
    playwright-cli -s=$S click "tr[data-uid=\"$U\"] .k-grid-delete" >/dev/null 2>&1; sleep 2
  done
  node "$D/add-lines.js" "$L" "$ST" > add.js
  A=$(ev add.js); echo "$A"
  echo "$A" | grep -q STOP && exit 1
  R=$(ev set.js)
fi
echo "$R"
echo "$R" | grep -q '^"set ' || exit 1
OUT=$(bash "$SK/danny-coops-payroll/scripts/save.sh" $S)
echo "$OUT" | grep -q "\"$ID\"" || { echo "FAIL: save answered $OUT"; exit 1; }

# upload only on a saved entry, from a freshly reloaded page
F=$(basename "$PDF"); cp "$PDF" .
playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
for i in 1 2 3 4; do
  bash "$SK/bowery-ubereats/scripts/snapshot.sh" $S snap.up.txt
  U=$(grep -oE 'button "Upload File" .ref=f?[0-9]*e[0-9]+' snap.up.txt | grep -oE 'f?[0-9]*e[0-9]+$' | tail -1)
  [ -n "$U" ] && break; sleep 5
done
[ -n "$U" ] || { echo "FAIL: no Upload File button"; exit 1; }
playwright-cli -s=$S click $U >/dev/null 2>&1
playwright-cli -s=$S upload "$F" >/dev/null 2>&1; sleep 8

playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
cat > att.js <<'EOF'
() => Array.from(document.querySelectorAll('a[ng-click^="AWS_S3_Uploader.getFile"]')).map(a => a.title).join(' | ')
EOF
echo "attached $(ev att.js)"
playwright-cli -s=$S eval "$(cat "$SK/bowery-weekly-mgmt-fees/scripts/read-lines.js")" > readback.txt 2>&1
node "$D/check-lines.js" "$L" readback.txt "$ST" "$NUM"

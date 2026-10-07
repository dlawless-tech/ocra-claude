#!/bin/bash
# Build one store's weekly Uber Eats fee entry by duplicating a prior Uber Eats entry (or, the first time, a DoorDash one). Does not approve.
# usage: post-entry.sh <session> <lines.json> <Sunday M/D/YYYY> <location> <source TransactionId>
# Prints "id <new id>", then MATCH or FAIL from check-entry.sh. REDO=<id> refills an existing, unapproved entry.
set -u
S="$1"; L="$2"; WE="$3"; LOC="$4"; SRC="$5"
D=$(dirname "$0"); SK="$D/../.."; HOST=https://flecha.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
ev() { playwright-cli -s=$S eval "$(cat "$1")" 2>&1 | res; }
ROW=$(node -e 'const x=require(require("path").resolve(process.argv[1])).find(v=>v.weekEnding===process.argv[2]&&v.loc===process.argv[3]);if(!x)process.exit(1);process.stdout.write(JSON.stringify(x))' "$L" "$WE" "$LOC") || { echo "FAIL: no line for $LOC $WE"; exit 1; }

if [ -n "${REDO:-}" ]; then ID="$REDO"; playwright-cli -s=$S goto "$HOST/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
else ID=$(bash "$SK/flecha-doordash/scripts/duplicate.sh" $S "$SRC" "$WE" "Uber Eats") || { echo "$ID"; exit 1; }; fi
echo "id $ID"

# header location and comment, then both lines: Dr 7161 / Cr 1235 at the fee, at the store; a DoorDash source has its 1239 line moved to 1235
cat > fue-set.js <<JS
() => { const x=$ROW;
const cb=jQuery('#journalEntryLocation').data('kendoComboBox');
const it=cb.dataSource.data().find(v=>v.locationName===x.loc); if(!it) return 'STOP: no location '+x.loc;
cb.value(it.locationId); cb.trigger('change');
const g=jQuery('[data-role=grid]').data('kendoGrid'); const d=Array.prototype.slice.call(g.dataSource.data());
if (d.length!==2) return 'STOP: '+d.length+' lines';
const fee=Math.abs(x.fee), dr=x.fee>=0;
for (const m of d) {
  const exp=/^7161 /.test(m.glAccount), ar=/^123[59] /.test(m.glAccount); if(!exp&&!ar) return 'STOP: line '+m.glAccount;
  if (ar) { m.set('glAccountId', '293b5f76-0674-4b91-b016-b99cd4577e44'); m.set('glAccount', '1235 - A/R - 3rd Party Delivery'); }
  m.set('locationId', it.locationId); m.set('location', x.loc);
  m.set('debit', (exp===dr)?fee:0); m.set('credit', (exp===dr)?0:fee); m.set('comment', x.comment); m.dirty=true; }
return 'set '+cb.text()+' '+fee; }
JS
# a REDO copy still carries the duplicate's date and number
playwright-cli -s=$S fill "#journalEntryDate" "$WE" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
playwright-cli -s=$S fill "#journalEntryNumber" "Uber Eats" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
R=$(ev fue-set.js); echo "$R"; echo "$R" | grep -q '"set ' || exit 1
playwright-cli -s=$S fill '#journalEntryComment' "$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).comment)' "$ROW")" >/dev/null 2>&1
playwright-cli -s=$S press Tab >/dev/null 2>&1
OUT=$(bash "$SK/danny-coops-payroll/scripts/save.sh" $S)
echo "$OUT" | grep -q "\"$ID\"" || { echo "FAIL: save answered $OUT"; exit 1; }

bash "$D/check-entry.sh" $S "$L" "$WE" "$LOC" "$ID"

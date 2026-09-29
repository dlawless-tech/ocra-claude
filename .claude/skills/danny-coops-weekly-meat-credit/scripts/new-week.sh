#!/bin/bash
# Duplicate the prior week's Meat Credit Adj entry onto a new Sunday.
# usage: new-week.sh <session> <prior TransactionId> <Sunday M/D/YYYY>
# Duplicate writes the copy on click, numbered NJ000xxxxx and dated today, in a
# new tab; this sets date and number, saves, and prints NEW: <TransactionId>.
set -u
S="$1"; PRIOR="$2"; SUN="$3"
PAY="$(dirname "$0")/../../danny-coops-payroll/scripts"
res() { sed -n '/### Result/{n;p;}' | sed 's/^"//; s/"$//'; }
js() { playwright-cli -s=$S eval "$1" 2>&1 | res; }
fail() { echo "FAIL: $1"; exit 1; }
NUM="Meat Credit Adj"

playwright-cli -s=$S goto "https://dannyandcoops.restaurant365.com/#/form/JournalEntryForm/$PRIOR" >/dev/null 2>&1
sleep 22
TABS=$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')
playwright-cli -s=$S click '#Action > a' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click 'li[data-testid=duplicateMenuItem]' >/dev/null 2>&1
for i in $(seq 1 10); do
  sleep 4
  [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt "$TABS" ] && break
done
[ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt "$TABS" ] || fail "duplicate opened no tab"
playwright-cli -s=$S tab-select "$TABS" >/dev/null 2>&1
sleep 15

for f in "#journalEntryDate $SUN" "#journalEntryNumber $NUM"; do
  playwright-cli -s=$S fill "${f%% *}" "${f#* }" >/dev/null 2>&1
  playwright-cli -s=$S press Tab >/dev/null 2>&1
done
GOT=$(js "() => [document.getElementById('journalEntryDate').value, document.getElementById('journalEntryNumber').value.trim()].join('|')")
[ "$GOT" = "$SUN|$NUM" ] || fail "header read back $GOT"
bash "$PAY/save.sh" "$S" | grep -q "^\[\[\"1\"" || fail "save rejected"
ID=$(js "() => location.hash.split('/').pop()")
echo "$ID" | grep -qE '^[0-9a-f-]{36}$' || fail "no id in $ID"
[ "$ID" != "$PRIOR" ] || fail "still on the prior entry"
echo "NEW: $ID"

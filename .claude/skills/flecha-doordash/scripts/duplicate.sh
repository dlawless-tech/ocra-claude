#!/bin/bash
# Duplicate a journal entry (transaction only), set its date and number, save, print the new id.
# usage: duplicate.sh <session> <source TransactionId> <date M/D/YYYY> <number>
# Leaves the copy open as the current tab. Exits nonzero on any step that does not land.
set -u
S="$1"; SRC="$2"; D="$3"; N="$4"
SNAP="$(dirname "$0")/../../bowery-ubereats/scripts/snapshot.sh"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '"'; }
# refs come as f12e203 on a first tab and e662 on later ones
ref() { grep -oE "$1 .ref=f?[0-9]*e[0-9]+" snap.dup.txt | grep -oE 'f?[0-9]*e[0-9]+$' | tail -1; }
# the menu row wrapping a button: the ref on the snapshot line above it
row() { grep -B1 -E "button \"$1\" .ref=" snap.dup.txt | head -1 | grep -oE 'f?[0-9]*e[0-9]+'; }

playwright-cli -s=$S goto "https://flecha.restaurant365.com/#/form/JournalEntryForm/$SRC" >/dev/null 2>&1; sleep 20
bash "$SNAP" $S snap.dup.txt; R=$(ref 'button "Action"'); [ -n "$R" ] || { echo "FAIL: no Action button"; exit 1; }
playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 2
bash "$SNAP" $S snap.dup.txt; R=$(row Duplicate); [ -n "$R" ] || { echo "FAIL: no Duplicate row"; exit 1; }
playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 3
# a source with no attachments skips the dialog and opens the copy tab directly
bash "$SNAP" $S snap.dup.txt; R=$(ref 'button "No, transaction only"')
if [ -n "$R" ]; then playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 15
else sleep 12; playwright-cli -s=$S tab-list 2>&1 | grep -qE '^- [0-9]+: .*Journal Entry - (NJ|JE)[0-9]+' || { echo "FAIL: no duplicate dialog or copy tab"; exit 1; }; fi

T=$(playwright-cli -s=$S tab-list 2>&1 | grep -E '^- [0-9]+: .*Journal Entry - (NJ|JE)[0-9]+' | tail -1 | grep -oE '^- [0-9]+' | grep -oE '[0-9]+')
[ -n "$T" ] || { echo "FAIL: no copy tab"; exit 1; }
playwright-cli -s=$S tab-select $T >/dev/null 2>&1; sleep 5
playwright-cli -s=$S fill '#journalEntryDate' "$D" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
playwright-cli -s=$S fill '#journalEntryNumber' "$N" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
H=$(playwright-cli -s=$S eval "() => document.getElementById('journalEntryDate').value + '|' + document.getElementById('journalEntryNumber').value" 2>&1 | res)
[ "$H" = "$D|$N" ] || { echo "FAIL: header reads $H"; exit 1; }
OUT=$(bash "$(dirname "$0")/../../danny-coops-payroll/scripts/save.sh" $S)
ID=$(echo "$OUT" | grep -oE '^\[\["1","[0-9a-f-]{36}"' | grep -oE '[0-9a-f-]{36}')
[ -n "$ID" ] || { echo "FAIL: save answered $OUT"; exit 1; }
echo "$ID"

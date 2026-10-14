#!/bin/bash
# Renumber and re-date an unapproved entry, header comment set to the number.
# usage: redate.sh <session> <id> <M/D/YYYY> <number>
set -u; S=$1; ID=$2; DT=$3; NUM=$4; HERE="$(cd "$(dirname "$0")" && pwd)"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
playwright-cli -s=$S goto "https://journeygroup.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 12
for f in "#journalEntryDate $DT" "#journalEntryNumber $NUM" "#journalEntryComment $NUM"; do playwright-cli -s=$S fill "${f%% *}" "${f#* }" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; done
GOT=$(playwright-cli -s=$S eval "() => ['journalEntryDate','journalEntryNumber','journalEntryComment'].map(i=>document.getElementById(i).value.trim()).join('|')" 2>&1 | res | tr -d '"')
[ "$GOT" = "$DT|$NUM|$NUM" ] || { echo "FAIL header $GOT"; exit 1; }
B=$(bash "$HERE/../../danny-coops-payroll/scripts/save.sh" $S)
case "$B" in *"\"1\",\"$ID\""*) echo "SAVED $ID $DT $NUM";; *) echo "FAIL save $B";; esac

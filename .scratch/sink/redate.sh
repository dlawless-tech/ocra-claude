#!/bin/bash
# usage: redate.sh <id> <date> <number>
set -u; S=sink; ID=$1; DT=$2; NUM=$3
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
playwright-cli -s=$S goto "https://journeygroup.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 12
for f in "#journalEntryDate $DT" "#journalEntryNumber $NUM"; do playwright-cli -s=$S fill "${f%% *}" "${f#* }" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; done
GOT=$(playwright-cli -s=$S eval "() => [document.getElementById('journalEntryDate').value, document.getElementById('journalEntryNumber').value.trim()].join('|')" 2>&1 | res | tr -d '"')
[ "$GOT" = "$DT|$NUM" ] || { echo "FAIL header $GOT"; exit 1; }
bash C:/Users/trici/ocra-claude/.claude/skills/danny-coops-payroll/scripts/save.sh $S

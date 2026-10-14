# usage: memo.sh <id> <comment>
S=sink; res() { sed -n '/### Result/{n;p}'; }
playwright-cli -s $S goto "https://journeygroup.restaurant365.com/#/form/JournalEntryForm/$1" >/dev/null 2>&1; sleep 12
playwright-cli -s $S fill '#journalEntryComment' "$2" >/dev/null 2>&1; playwright-cli -s $S press Tab >/dev/null 2>&1; sleep 1
G=$(playwright-cli -s $S eval "() => document.getElementById('journalEntryNumber').value+'|'+document.getElementById('journalEntryComment').value" 2>&1 | res)
echo "$G $(bash C:/Users/trici/ocra-claude/.claude/skills/danny-coops-payroll/scripts/save.sh $S)"

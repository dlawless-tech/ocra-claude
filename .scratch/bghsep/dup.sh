#!/bin/bash
# dup.sh <session> <source-id> <line specs...>: duplicate, date 9/30, fill, save, verify
S="$1"; SRC="$2"; shift 2
H=.claude/skills/bowery-grubhub/scripts; W=.scratch/bghsep
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/$SRC" >/dev/null 2>&1; sleep 14
playwright-cli -s=$S hover '#Action > a' >/dev/null 2>&1
playwright-cli -s=$S eval "() => { const a=Array.from(document.getElementById('Action').querySelectorAll('ul li a, ul li button')).find(x=>x.innerText.trim()==='Duplicate'); a.click(); return 'clicked'; }" 2>&1 | res; echo
sleep 12
N=$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')
[ "$N" -ge 2 ] || { echo "FAIL no duplicate tab"; exit 1; }
playwright-cli -s=$S tab-select $((N-1)) >/dev/null 2>&1; sleep 4
playwright-cli -s=$S fill 'input[name="journalEntryDate"]' "9/30/2026" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill 'input[name="journalEntryNumber"]' "GrubHub" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 2
bash $W/fillall.sh $S "$@" || exit 1; echo
bash $H/ribbon-menu.sh $S Save "Save" >/dev/null 2>&1; sleep 12; playwright-cli -s=$S reload >/dev/null 2>&1; sleep 15
playwright-cli -s=$S eval "$(cat $W/verify.js)" 2>&1 | res; echo
[ "${KEEP:-0}" = 1 ] || playwright-cli -s=$S tab-close >/dev/null 2>&1

#!/bin/bash
# Make a new GrubHub entry from an existing one: Action > Duplicate, set the date, zero every line, save.
# Prints the new TransactionId. Fill it afterwards with post-entry.sh like any template.
# usage: duplicate-entry.sh <session> <source TransactionId> <M/D/YYYY>
set -u
S=$1; SRC=$2; DT=$3; HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "FAIL: $*"; exit 1; }
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/$SRC" >/dev/null 2>&1; sleep 14
playwright-cli -s=$S hover '#Action > a' >/dev/null 2>&1; sleep 1
R=$(playwright-cli -s=$S eval "() => { const a=Array.from(document.getElementById('Action').querySelectorAll('ul li a, ul li button')).find(x=>x.innerText.trim()==='Duplicate'); if(!a) return 'nodup'; a.click(); return 'ok'; }" 2>&1 | res)
case "$R" in *ok*) : ;; *) die "Duplicate menu item: $R";; esac
sleep 12
# the copy opens in a new tab, numbered NJ..., dated today, carrying the source amounts
N=$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:'); [ "$N" -ge 2 ] || die "no duplicate tab"
playwright-cli -s=$S tab-select $((N-1)) >/dev/null 2>&1; sleep 4
playwright-cli -s=$S fill 'input[name="journalEntryDate"]' "$DT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill 'input[name="journalEntryNumber"]' "GrubHub" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 2
# wake the grid with one real click, then zero both columns of every line
TMP=$(mktemp); bash "$HERE/snapshot.sh" $S $TMP
LN=$(grep -n 'gridcell "commissions"' $TMP | head -1 | cut -d: -f1); [ -n "$LN" ] || die "grid not in snapshot"
playwright-cli -s=$S click "$(sed -n "$((LN-1))p" $TMP | grep -oE 'ref=[a-zA-Z0-9]+' | head -1 | cut -d= -f2)" >/dev/null 2>&1; rm -f $TMP
sleep 2; playwright-cli -s=$S press Escape >/dev/null 2>&1; sleep 1
ROWS=$(playwright-cli -s=$S eval "() => Array.from(document.querySelectorAll('tr')).filter(r=>r.cells && r.cells.length>=8 && /^\d{3}-\d{2}/.test(r.cells[1].innerText.trim())).length" 2>&1 | res)
for i in $(seq 0 $((ROWS-1))); do for C in 3 4; do
  playwright-cli -s=$S eval "() => { const r=Array.from(document.querySelectorAll('tr')).filter(r=>r.cells && r.cells.length>=8 && /^\d{3}-\d{2}/.test(r.cells[1].innerText.trim()))[$i]; r.cells[$C].click(); return 1; }" >/dev/null 2>&1; sleep 2
  playwright-cli -s=$S fill "input[name=\"$([ $C = 3 ] && echo debit || echo credit)\"]" "0" >/dev/null 2>&1
  playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Escape >/dev/null 2>&1; sleep 1
done; done
V=$(playwright-cli -s=$S eval "() => [document.querySelector('input[name=journalEntryDate]').value, document.querySelector('input[name=journalEntryNumber]').value, Array.from(document.querySelectorAll('tr')).filter(r=>r.cells && r.cells.length>=8 && /^\d{3}-\d{2}/.test(r.cells[1].innerText.trim())).map(r=>r.cells[3].innerText.trim()+'/'+r.cells[4].innerText.trim()).join(',')].join(' ')" 2>&1 | res | tr -d '"')
case "$V" in "$DT GrubHub "*) : ;; *) die "header did not take: $V";; esac
echo "$V" | cut -d" " -f3 | grep -qE "[1-9]" && die "lines not zeroed: $V"
bash "$HERE/ribbon-menu.sh" $S Save "Save" >/dev/null 2>&1; sleep 12
ID=$(playwright-cli -s=$S eval "() => location.hash.split('/').pop()" 2>&1 | res | tr -d '"')
playwright-cli -s=$S tab-close >/dev/null 2>&1
echo "$ID"

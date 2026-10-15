#!/bin/bash
# Memorize a weekly template from one approved accrual entry: Action > Memorize, Weekly, named "<nnn - Store>:<NUM>".
# Usage: [UTIL=electric] memorize-template.sh <session> <entry id> "<nnn - Store>"
# Prints the Memorize response; confirm the new "Template: ..." row on All Transactions with list-entries.js.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/profile.sh"
S=$1; ID=$2; STORE=$3; NAME="$STORE:$NUM"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 15
playwright-cli -s=$S eval "() => { const x=document.querySelector('#pendo-base ._pendo-close-guide'); if(x) x.click(); return 1; }" >/dev/null 2>&1  # Pendo guide blocks real clicks
H=$(playwright-cli -s=$S eval "() => document.querySelector('[name=journalEntryNumber]').value+' | '+document.querySelector('[name=journalEntryLocation_input]').value" 2>&1 | res)
case "$H" in *"$NUM"*"$STORE"*) ;; *) echo "$STORE | FAIL wrong entry: $H"; exit 1;; esac
playwright-cli -s=$S hover '#Action > a' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S eval "() => { const it=[...document.querySelectorAll('#Action ul li')].filter(a=>a.innerText.trim()==='Memorize'); it[it.length-1].click(); return 1; }" >/dev/null 2>&1; sleep 5
playwright-cli -s=$S eval "() => { document.getElementById('memorizeAutoRecurrence').querySelector('.k-select, .k-i-arrow-s').click(); return 1; }" >/dev/null 2>&1; sleep 3
playwright-cli -s=$S eval "() => { [...document.querySelectorAll('ul.k-list li')].filter(e=>e.offsetParent && e.innerText.trim()==='Weekly')[0].click(); return 1; }" >/dev/null 2>&1; sleep 2
playwright-cli -s=$S fill 'input[name="name"]' "$NAME" >/dev/null 2>&1; sleep 1
V=$(playwright-cli -s=$S eval "() => document.querySelector('input[name=\"name\"]').value+' | '+document.querySelector('#memorizeAutoRecurrence input.k-input').value" 2>&1 | res)
case "$V" in *"$NAME"*Weekly*) ;; *) echo "$STORE | FAIL dialog: $V"; exit 1;; esac
playwright-cli -s=$S eval "() => { const b=[...document.querySelectorAll('button, a')].filter(e=>e.offsetParent && e.innerText.trim()==='Memorize'); b[b.length-1].click(); return 1; }" >/dev/null 2>&1; sleep 8
N=$(playwright-cli -s=$S requests 2>&1 | grep -i memoriz | tail -1)
echo "$STORE | $V | memorize sent | $N"

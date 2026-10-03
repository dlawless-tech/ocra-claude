#!/bin/bash
# Screenshot one store's Grubhub deposit history over a date range, for a no-sales week.
# usage: capture-none.sh <session> <restaurant id> <out prefix> <MM/DD/YYYY - MM/DD/YYYY>
# writes <prefix>.png (the list) and <prefix>-pick.png (location picker open, the store checked); prints the list's message
S=$1; RID=$2; OUT=$3; RANGE=$4
playwright-cli -s=$S goto "https://restaurant.grubhub.com/financials/deposit-history/$RID" >/dev/null 2>&1; sleep 10
# dismiss the terms popup with its close button, never "I agree"
playwright-cli -s=$S eval "() => { const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.trim()==='×'); if(b) b.click(); return 1; }" >/dev/null 2>&1
playwright-cli -s=$S click 'input[placeholder="Select a range of dates"]' >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill 'input[placeholder="Select a range of dates"]' "$RANGE" >/dev/null 2>&1; playwright-cli -s=$S press Enter >/dev/null 2>&1; sleep 6
playwright-cli -s=$S click 'h1' >/dev/null 2>&1; sleep 1
playwright-cli -s=$S screenshot --filename="$OUT.png" >/dev/null 2>&1
M=$(playwright-cli -s=$S eval "() => (document.body.innerText.match(/Recent Deposits[^\n]*\n[^\n]*/)||['?'])[0]" 2>&1 | sed -n '/### Result/{n;p}' | tr -d '"')
playwright-cli -s=$S click 'text=Location selected' >/dev/null 2>&1; sleep 2
P=$(playwright-cli -s=$S eval "() => { const o=document.querySelector('[role=option][aria-selected=true]'); if(!o) return 'none'; o.scrollIntoView({block:'center'}); return o.innerText.trim(); }" 2>&1 | sed -n '/### Result/{n;p}' | tr -d '"')
playwright-cli -s=$S screenshot --filename="$OUT-pick.png" >/dev/null 2>&1
# close the picker so the next goto starts clean
playwright-cli -s=$S click 'text=Location selected' >/dev/null 2>&1
echo "$RID $P | $M"

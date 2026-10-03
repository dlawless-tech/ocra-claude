#!/bin/bash
# Screenshot one Grubhub deposit's detail panel, full height.
# usage: capture-deposit.sh <session> <restaurant id> <short_distribution_id> <out.png> <MM/DD/YYYY - MM/DD/YYYY>
# the date range must hold the deposit's paid date; out.png sits under the working directory
S=$1; RID=$2; SID=$3; OUT=$4; RANGE=$5
playwright-cli -s=$S goto "https://restaurant.grubhub.com/financials/deposit-history/$RID" >/dev/null 2>&1; sleep 10
# dismiss the terms popup with its close button, never "I agree"
playwright-cli -s=$S eval "() => { const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.trim()==='×'); if(b) b.click(); return 1; }" >/dev/null 2>&1
playwright-cli -s=$S click 'input[placeholder="Select a range of dates"]' >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill 'input[placeholder="Select a range of dates"]' "$RANGE" >/dev/null 2>&1; playwright-cli -s=$S press Enter >/dev/null 2>&1; sleep 6
playwright-cli -s=$S click "td:has-text(\"$SID\")" >/dev/null 2>&1; sleep 8
# the panel scrolls inside a modal, so copy it into a full-height overlay first
H=$(playwright-cli -s=$S eval "() => { document.getElementById('bkp')?.remove(); const d=document.querySelector('.fin-deposit-history-deposit-details'); if(!d) return 0; const o=document.createElement('div'); o.id='bkp'; o.style.cssText='position:absolute;top:0;left:0;width:900px;background:#fff;z-index:2147483647;padding:8px'; o.appendChild(d.cloneNode(true)); document.body.appendChild(o); return o.offsetHeight; }" 2>&1 | sed -n '/### Result/{n;p}')
[ "${H:-0}" -gt 200 ] || { echo "FAIL $SID: detail panel not found"; exit 1; }
playwright-cli -s=$S screenshot '#bkp' --filename="$OUT" >/dev/null 2>&1
T=$(playwright-cli -s=$S eval "() => (document.getElementById('bkp').innerText.match(/Deposit Total[^\n]*/)||['?'])[0]" 2>&1 | sed -n '/### Result/{n;p}' | tr -d '"')
echo "$SID $T"

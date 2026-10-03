#!/bin/bash
# shoot.sh <restId> <suffix> : screenshot every listed deposit for a store into shots/<sid>.png
S=bgh; RID=$1; SUF=$2; W=.scratch/bghsep
open_list() {
  playwright-cli -s=$S goto "https://restaurant.grubhub.com/financials/deposit-history/$RID" >/dev/null 2>&1; sleep 10
  playwright-cli -s=$S eval "() => { const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.trim()==='×'); if(b) b.click(); return 1; }" >/dev/null 2>&1
  playwright-cli -s=$S click 'input[placeholder="Select a range of dates"]' >/dev/null 2>&1; sleep 1
  playwright-cli -s=$S fill 'input[placeholder="Select a range of dates"]' "08/28/2026 - 10/03/2026" >/dev/null 2>&1; playwright-cli -s=$S press Enter >/dev/null 2>&1; sleep 6
}
for P in 26090401 26091109 26091816 26092523 26100230 26100201; do SID=$P$SUF
  open_list
  playwright-cli -s=$S click "td:has-text(\"$SID\")" >/dev/null 2>&1; sleep 8
  T=$(playwright-cli -s=$S eval "$(cat $W/clone.js)" 2>&1 | sed -n '/### Result/{n;p}')
  playwright-cli -s=$S screenshot '#bkp' --filename=$W/shots/$SID.png >/dev/null 2>&1
  TOT=$(playwright-cli -s=$S eval "() => (document.getElementById('bkp').innerText.match(/Deposit Total[^\n]*/)||['?'])[0]" 2>&1 | sed -n '/### Result/{n;p}')
  echo "$SID h=$T $TOT"
done

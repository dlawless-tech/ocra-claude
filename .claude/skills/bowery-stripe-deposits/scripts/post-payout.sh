#!/bin/bash
# Post one Shuka Stripe payout as a Bank Deposit from the open 100-03 Bank Activity page.
# Usage: post-payout.sh <r365 session> <stripe session> <payout id po_...> <bank amount> <bank date M/D/YYYY>
# Needs the R365 session on Bank Activity with 100-03 selected, and the Stripe session logged in.
# Ends on MATCH, or stops with FAIL:/STOP: before or after Create Deposit (it says which).
set -u
R="$1"; ST="$2"; PO="$3"; AMT="$4"; BD="$5"
K="$(dirname "$0")"; NS="$K/../../norms-stripe-deposits/scripts"; SN="$K/../../bowery-ubereats/scripts/snapshot.sh"
ACCT_URL='https://dashboard.stripe.com/acct_1MgBLnIS5DK8HsZn'
res() { sed -n '/### Result/{n;p;}'; }
unq() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s.trim())))}catch(e){process.stdout.write(s)}})'; }
act() { local s="$1" what="$2"; shift 2; playwright-cli -s=$s "$@" 2>&1 | grep -q '### Error' && { echo "FAIL: $what"; exit 1; }; :; }

# bank line: date and row must exist before anything is keyed
ROW=$(playwright-cli -s=$R eval "() => { const r=jQuery('#BankActivityUnmatchedGrid').data('kendoGrid').dataSource.data().toJSON().map(r=>({...r,md:(d=>(d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear())(new Date(r.Date))})).filter(r=>Math.round(r.Amount*100)===Math.round($AMT*100) && /STRIPE/i.test(r.Name) && r.md==='$BD'); if(r.length!==1) return 'rows '+r.length; return r[0].md; }" 2>&1 | res | unq)
[ "$ROW" = "$BD" ] || { echo "STOP: unmatched Stripe lines at $AMT on $BD: $ROW"; exit 1; }
ISO=$(node -e 'const [m,d,y]=process.argv[1].split("/");console.log(y+"-"+m.padStart(2,"0")+"-"+d.padStart(2,"0"))' "$BD")
FILE="$(echo "$BD" | cut -d/ -f1-2 | tr / .) Shuka Stripe transfers.csv"

# Stripe export; the download always lands as .playwright-cli/transfers.csv
rm -f .playwright-cli/transfers.csv
act $ST 'open payout' goto "$ACCT_URL/payouts/$PO"; sleep 9
GOT=$(playwright-cli -s=$ST eval "() => (document.querySelector('main').innerText.match(/Payouts\n[$]([0-9,.]+)/)||[])[1]" 2>&1 | res | unq | tr -d ,)
[ "$(printf '%.2f' "$GOT")" = "$(printf '%.2f' "$AMT")" ] || { echo "STOP: $PO shows $GOT, bank $AMT"; exit 1; }
DEST=$(playwright-cli -s=$ST eval "() => /•+ 2636/.test(document.querySelector('main').innerText)" 2>&1 | res | unq)
[ "$DEST" = true ] || { echo "STOP: $PO is not paid to Shuka 2636"; exit 1; }
# the export dialog sometimes stalls on "Applying finishing touches"; cancel, reload, one retry
for try in 1 2; do
  bash "$SN" $ST ex.txt; EX=$(grep -A1 -F 'Transactions' ex.txt | grep -F 'button "Export"' | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2 | head -1)
  [ -n "$EX" ] || { echo "FAIL: no Export button on $PO"; exit 1; }
  act $ST 'Export' click "$EX"
  for i in $(seq 1 20); do sleep 2; [ -s .playwright-cli/transfers.csv ] && break; done
  [ -s .playwright-cli/transfers.csv ] && break
  playwright-cli -s=$ST click '[role=alertdialog] button:has-text("Cancel")' >/dev/null 2>&1
  act $ST 'reload payout' goto "$ACCT_URL/payouts/$PO"; sleep 12
done
[ -s .playwright-cli/transfers.csv ] || { echo "FAIL: no export for $PO"; exit 1; }
playwright-cli -s=$ST press Escape >/dev/null 2>&1
cp .playwright-cli/transfers.csv "$FILE"

PLAN="plan-$ISO.json"
node "$K/plan-lines.js" "$FILE" "$BD" "$AMT" > "$PLAN" || { cat "$PLAN"; exit 1; }

# open the deposit from the bank line; grid re-renders after a prior save, so wait for the row and retry
SHOW=$(printf "%'.2f" "$AMT")
READY="() => !jQuery('#BankActivityUnmatchedGrid .k-loading-mask:visible').length && [...document.querySelectorAll('#BankActivityUnmatchedGrid tbody tr')].filter(t=>t.innerText.includes('$SHOW')&&t.innerText.includes('$BD')&&[...t.querySelectorAll('a')].some(a=>a.textContent.trim()==='Deposit')).length"
OPENED=""
for try in 1 2 3 4; do
  for i in $(seq 1 15); do [ "$(playwright-cli -s=$R eval "$READY" 2>&1 | res | unq)" = 1 ] && break; sleep 2; done
  playwright-cli -s=$R click "#BankActivityUnmatchedGrid tbody tr:has-text('$SHOW'):has-text('$BD ') a:text-is('Deposit')" 2>&1 | grep -q '### Error' || { OPENED=1; break; }
  sleep 5
done
[ -n "$OPENED" ] || { echo "FAIL: Deposit link (not created)"; exit 1; }
sleep 10
HD=$(playwright-cli -s=$R eval "() => { const w=[...document.querySelectorAll('.k-window')].find(x=>/Create Deposit/.test(x.innerText)&&getComputedStyle(x).display!=='none'); return w ? w.querySelector('#bankDepositDate').value : 'no window'; }" 2>&1 | res | unq)
[ "$HD" = "$BD" ] || { echo "FAIL: deposit window date $HD, bank $BD (not created)"; exit 1; }

bash "$NS/add-lines.sh" $R "$PLAN" || { echo "(not created)"; exit 1; }
TOT=$(playwright-cli -s=$R eval "() => (jQuery('#bankDepositDetailsGrid').data('kendoGrid').dataSource.data().toJSON().reduce((s,r)=>s+Math.round(r.total*100),0)/100).toFixed(2)" 2>&1 | res | unq)
[ "$TOT" = "$(printf '%.2f' "$AMT")" ] || { echo "FAIL: adjustments total $TOT, bank $AMT (not created)"; exit 1; }

# attach the export: a real click opens the chooser, upload answers it
bash "$SN" $R up.txt; UP=$(grep -F 'button "Upload File"' up.txt | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2 | tail -1)
act $R 'Upload File' click "$UP"; act $R 'upload' upload "$FILE"; sleep 6
bash "$SN" $R up.txt; grep -qF "link \"$FILE\"" up.txt || { echo "FAIL: $FILE not attached (not created)"; exit 1; }

LAST=$(playwright-cli -s=$R requests 2>&1 | grep 'SaveDeposit' | tail -1 | grep -oE '^[0-9]+')
act $R 'Create Deposit' click '[data-testid=createDepositMenuItem] >> visible=true'
IDX=""; for i in $(seq 1 20); do sleep 2; IDX=$(playwright-cli -s=$R requests 2>&1 | grep 'SaveDeposit' | tail -1 | grep -oE '^[0-9]+'); [ -n "$IDX" ] && [ "$IDX" != "${LAST:-}" ] && break; IDX=""; done
[ -n "$IDX" ] || { echo "FAIL: Create Deposit sent no save"; exit 1; }
ID=$(playwright-cli -s=$R response-body "$IDX" 2>&1 | grep -oE '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' | head -1 | tr 'A-F' 'a-f')
[ -n "$ID" ] || { echo "FAIL: save answered $(playwright-cli -s=$R response-body "$IDX" 2>&1 | grep -oE '\[.*\]' | head -1)"; exit 1; }
sleep 5

# read the server copy in its own tab
act $R 'open saved deposit' tab-new "https://bowerygroup.restaurant365.com/#/form/BankDepositForm/$ID"; sleep 18
playwright-cli -s=$R eval "$(cat "$NS/read-deposit.js")" 2>&1 | res | unq > "back-$ISO.json"
# close only a tab this run opened; closing the last one drops Bank Activity
[ "$(playwright-cli -s=$R tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ] && playwright-cli -s=$R tab-close >/dev/null 2>&1
playwright-cli -s=$R tab-select 0 >/dev/null 2>&1
node "$NS/check-deposit.js" "$PLAN" "back-$ISO.json" "$FILE"

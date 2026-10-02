#!/bin/bash
# Post one Stripe payout as a Bank Deposit on 1123.
# Usage: post-payout.sh <r365 session> <stripe session> <payout id po_...> <amount> [deposit date M/D/YYYY]
# Needs the R365 session on Bank Activity with 1123 selected, and the Stripe session logged in.
# With its bank line: the deposit is created from that line, dated the bank date unless a date is given.
# With no bank line and a date given: a standalone deposit, which the bank line matches when it lands.
# Ends on MATCH, or stops with FAIL:/STOP: before or after the save (it says which).
set -u
R="$1"; ST="$2"; PO="$3"; AMT="$4"; DEP="${5:-}"
K="$(dirname "$0")"
ACCT_URL='https://dashboard.stripe.com/acct_1JKplFAju1EvNWw5'
R365='https://unoatfifth.restaurant365.com'
res() { sed -n '/### Result/{n;p;}'; }
unq() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s.trim())))}catch(e){process.stdout.write(s)}})'; }
act() { local s="$1" what="$2"; shift 2; playwright-cli -s=$s "$@" 2>&1 | grep -q '### Error' && { echo "FAIL: $what"; exit 1; }; :; }
iso() { node -e 'const [m,d,y]=process.argv[1].split("/");console.log(y+"-"+m.padStart(2,"0")+"-"+d.padStart(2,"0"))' "$1"; }
SN="$K/../../bowery-ubereats/scripts/snapshot.sh"
# set the visible deposit date and read it back
setdate() {
  act $R 'deposit date' fill '#bankDepositDate >> visible=true' "$1"; playwright-cli -s=$R press Tab >/dev/null 2>&1; sleep 2
  local got; got=$(playwright-cli -s=$R eval "() => [...document.querySelectorAll('#bankDepositDate')].find(x=>x.offsetParent).value" 2>&1 | res | unq)
  [ "$got" = "$1" ] || { echo "FAIL: deposit date reads $got, want $1 (not created)"; exit 1; }
}

# bank line: one row, or none when posting ahead with a date
[[ -z "$DEP" || "$DEP" =~ ^[0-9]+/[0-9]+/[0-9]{4}$ ]] || { echo "STOP: deposit date $DEP is not M/D/YYYY"; exit 1; }
ROW=$(playwright-cli -s=$R eval "() => { const r=jQuery('#BankActivityUnmatchedGrid').data('kendoGrid').dataSource.data().toJSON().filter(r=>Math.round(r.Amount*100)===Math.round($AMT*100) && /STRIPE/.test(r.Name)); if(r.length!==1) return 'rows '+r.length; const d=new Date(r[0].Date); return (d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear(); }" 2>&1 | res | unq)
if [[ "$ROW" =~ ^[0-9]+/[0-9]+/[0-9]{4}$ ]]; then AHEAD=; BANK="$ROW"
elif [ "$ROW" = 'rows 0' ] && [ -n "$DEP" ]; then AHEAD=1; BANK="$DEP"
else echo "STOP: unmatched STRIPE lines at $AMT: $ROW"; exit 1; fi
DATE="${DEP:-$BANK}"; ISO=$(iso "$BANK")
FILE="Stripe payout $ISO $AMT.csv"

# Stripe export; the download always lands as .playwright-cli/transfers.csv
rm -f .playwright-cli/transfers.csv
act $ST 'open payout' goto "$ACCT_URL/payouts/$PO"; sleep 9
GOT=$(playwright-cli -s=$ST eval "() => (document.querySelector('main').innerText.match(/Payouts\n\\\$([0-9,.]+)/)||[])[1]" 2>&1 | res | unq | tr -d ,)
[ "$(printf '%.2f' "$GOT")" = "$(printf '%.2f' "$AMT")" ] || { echo "STOP: $PO shows $GOT, bank $AMT"; exit 1; }
bash "$SN" $ST ex.txt; EX=$(grep -A1 -F 'Transactions' ex.txt | grep -F 'button "Export"' | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2 | head -1)
[ -n "$EX" ] || { echo "FAIL: no Export button on $PO"; exit 1; }
act $ST 'Export' click "$EX"
for i in $(seq 1 15); do sleep 2; [ -s .playwright-cli/transfers.csv ] && break; done
[ -s .playwright-cli/transfers.csv ] || { echo "FAIL: no export for $PO"; exit 1; }
playwright-cli -s=$ST press Escape >/dev/null 2>&1
cp .playwright-cli/transfers.csv "$FILE"

PLAN="plan-$ISO-$AMT.json"
node "$K/plan-lines.js" "$FILE" "$DATE" "$AMT" > "$PLAN" || { cat "$PLAN"; exit 1; }

if [ -z "$AHEAD" ]; then
  # open the deposit from the bank line
  act $R 'Deposit link' click "#BankActivityUnmatchedGrid tbody tr:has-text('$(printf "%'.2f" "$AMT")') a:text-is('Deposit')"; sleep 10
  HD=$(playwright-cli -s=$R eval "() => { const w=[...document.querySelectorAll('.k-window')].find(x=>/Create Deposit/.test(x.innerText)&&getComputedStyle(x).display!=='none'); return w ? w.querySelector('#bankDepositDate').value : 'no window'; }" 2>&1 | res | unq)
  [ "$HD" = "$BANK" ] || { echo "FAIL: deposit window date $HD, bank $BANK (not created)"; exit 1; }
  SCOPE='.k-window:has-text("Create Deposit")'
else
  # blank form in its own tab; it defaults to 1123 and 10200
  act $R 'blank deposit' tab-new "$R365/#/form/BankDepositForm/00000000-0000-0000-0000-000000000000"; sleep 18
  HDR=$(playwright-cli -s=$R eval "() => { const v=[...document.querySelectorAll('input')].filter(i=>i.offsetParent).map(i=>i.value); return [v.some(x=>x.startsWith('1123 - ')), v.some(x=>x.startsWith('10200 - '))].join(); }" 2>&1 | res | unq)
  [ "$HDR" = 'true,true' ] || { echo "FAIL: blank deposit not on 1123 / 10200 ($HDR) (not created)"; exit 1; }
  SCOPE='body'
fi
[ "$DATE" = "$BANK" ] && [ -z "$AHEAD" ] || setdate "$DATE"

bash "$K/add-lines.sh" $R "$PLAN" "$SCOPE" || { echo "(not created)"; exit 1; }
TOT=$(playwright-cli -s=$R eval "() => (jQuery('#bankDepositDetailsGrid').data('kendoGrid').dataSource.data().toJSON().reduce((s,r)=>s+Math.round(r.total*100),0)/100).toFixed(2)" 2>&1 | res | unq)
[ "$TOT" = "$(printf '%.2f' "$AMT")" ] || { echo "FAIL: adjustments total $TOT, bank $AMT (not created)"; exit 1; }

# attach the export: a real click opens the chooser, upload answers it
bash "$SN" $R up.txt; UP=$(grep -F 'button "Upload File"' up.txt | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2 | tail -1)
act $R 'Upload File' click "$UP"; act $R 'upload' upload "$FILE"; sleep 6
bash "$SN" $R up.txt; grep -qF "link \"$FILE\"" up.txt || { echo "FAIL: $FILE not attached (not created)"; exit 1; }

if [ -z "$AHEAD" ]; then
  LAST=$(playwright-cli -s=$R requests 2>&1 | grep 'SaveDeposit' | tail -1 | grep -oE '^[0-9]+')
  act $R 'Create Deposit' click '[data-testid=createDepositMenuItem] >> visible=true'
  IDX=""; for i in $(seq 1 20); do sleep 2; IDX=$(playwright-cli -s=$R requests 2>&1 | grep 'SaveDeposit' | tail -1 | grep -oE '^[0-9]+'); [ -n "$IDX" ] && [ "$IDX" != "${LAST:-}" ] && break; IDX=""; done
  [ -n "$IDX" ] || { echo "FAIL: Create Deposit sent no save"; exit 1; }
  ID=$(playwright-cli -s=$R response-body "$IDX" 2>&1 | grep -oE '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' | head -1 | tr 'A-F' 'a-f')
  [ -n "$ID" ] || { echo "FAIL: save answered $(playwright-cli -s=$R response-body "$IDX" 2>&1 | grep -oE '\[.*\]' | head -1)"; exit 1; }
  sleep 5
else
  # ribbon Approve saves and approves; the route then carries the new id
  playwright-cli -s=$R hover '#Approve > a' >/dev/null 2>&1; sleep 1
  playwright-cli -s=$R eval "() => { const it=[...document.getElementById('Approve').querySelectorAll('ul li a, ul li button')].filter(a=>a.innerText.trim()==='Approve'); it[it.length-1].click(); }" >/dev/null 2>&1
  ID=""; for i in $(seq 1 15); do sleep 2; ID=$(playwright-cli -s=$R eval "() => location.hash" 2>&1 | res | unq | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | grep -v '^00000000-'); [ -n "$ID" ] && break; done
  [ -n "$ID" ] || { echo "FAIL: Approve saved nothing (not created; close the tab)"; exit 1; }
  sleep 5; playwright-cli -s=$R tab-close >/dev/null 2>&1; playwright-cli -s=$R tab-select 0 >/dev/null 2>&1
fi

# read the server copy in its own tab
act $R 'open saved deposit' tab-new "$R365/#/form/BankDepositForm/$ID"; sleep 18
playwright-cli -s=$R eval "$(cat "$K/read-deposit.js")" 2>&1 | res | unq > "back-$ISO-$AMT.json"
# close only a tab this run opened; closing the last one drops Bank Activity
[ "$(playwright-cli -s=$R tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ] && playwright-cli -s=$R tab-close >/dev/null 2>&1
playwright-cli -s=$R tab-select 0 >/dev/null 2>&1
node "$K/check-deposit.js" "$PLAN" "back-$ISO-$AMT.json" "$FILE"

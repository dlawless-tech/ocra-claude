#!/bin/bash
# Post one NORMS Stripe payout as a Bank Deposit from the open 1020 Bank Activity page.
# Usage: post-payout.sh <r365 session> <stripe session> <gc|inkind> <payout id po_...> <bank amount>
# Needs the R365 session on Bank Activity with 1020 selected, and the Stripe session logged in.
# Ends on MATCH, or stops with FAIL:/STOP: before or after Create Deposit (it says which).
set -u
R="$1"; ST="$2"; STREAM="$3"; PO="$4"; AMT="$5"
K="$(dirname "$0")"
case "$STREAM" in
  gc) ACCT_URL='https://dashboard.stripe.com/acct_1IVMd4Icg0NAKHmc'; LABEL=GC;;
  inkind) ACCT_URL='https://dashboard.stripe.com/acct_1R6e5CRrbOF3zRps'; LABEL='In Kind';;
  *) echo "STOP: stream $STREAM, want gc or inkind"; exit 1;;
esac
res() { sed -n '/### Result/{n;p;}'; }
unq() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s.trim())))}catch(e){process.stdout.write(s)}})'; }
act() { local s="$1" what="$2"; shift 2; playwright-cli -s=$s "$@" 2>&1 | grep -q '### Error' && { echo "FAIL: $what"; exit 1; }; :; }
winpath() { cygpath -w "$PWD/$1"; }

# bank line: date and row must exist before anything is keyed
ROW=$(playwright-cli -s=$R eval "() => { const r=jQuery('#BankActivityUnmatchedGrid').data('kendoGrid').dataSource.data().toJSON().filter(r=>Math.round(r.Amount*100)===Math.round($AMT*100) && /STRIPE/.test(r.Name)); if(r.length!==1) return 'rows '+r.length; const d=new Date(r[0].Date); return (d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear(); }" 2>&1 | res | unq)
[[ "$ROW" =~ ^[0-9]+/[0-9]+/[0-9]{4}$ ]] || { echo "STOP: unmatched STRIPE lines at $AMT: $ROW"; exit 1; }
DATE="$ROW"; ISO=$(node -e 'const [m,d,y]=process.argv[1].split("/");console.log(y+"-"+m.padStart(2,"0")+"-"+d.padStart(2,"0"))' "$DATE")
FILE="${ISO:5:2}.${ISO:8:2} $LABEL Stripe Transfer.csv"

# Stripe export; the download always lands as .playwright-cli/transfers.csv
rm -f .playwright-cli/transfers.csv
act $ST 'open payout' goto "$ACCT_URL/payouts/$PO"; sleep 9
GOT=$(playwright-cli -s=$ST eval "() => (document.querySelector('main').innerText.match(/Payouts\n\\\$([0-9,.]+)/)||[])[1]" 2>&1 | res | unq | tr -d ,)
[ "$(printf '%.2f' "$GOT")" = "$(printf '%.2f' "$AMT")" ] || { echo "STOP: $PO shows $GOT, bank $AMT"; exit 1; }
SN="$K/../../bowery-ubereats/scripts/snapshot.sh"
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

PLAN="plan-$ISO-$STREAM.json"
node "$K/plan-lines.js" $STREAM "$FILE" "$DATE" "$AMT" > "$PLAN" || { cat "$PLAN"; exit 1; }

# open the deposit from the bank line
act $R 'Deposit link' click "#BankActivityUnmatchedGrid tbody tr:has-text('$(printf "%'.2f" "$AMT")') a:text-is('Deposit')"; sleep 10
HD=$(playwright-cli -s=$R eval "() => { const w=[...document.querySelectorAll('.k-window')].find(x=>/Create Deposit/.test(x.innerText)&&getComputedStyle(x).display!=='none'); return w ? w.querySelector('#bankDepositDate').value : 'no window'; }" 2>&1 | res | unq)
[ "$HD" = "$DATE" ] || { echo "FAIL: deposit window date $HD, bank $DATE (not created)"; exit 1; }

bash "$K/add-lines.sh" $R "$PLAN" || { echo "(not created)"; exit 1; }
TOT=$(playwright-cli -s=$R eval "() => (jQuery('#bankDepositDetailsGrid').data('kendoGrid').dataSource.data().toJSON().reduce((s,r)=>s+Math.round(r.total*100),0)/100).toFixed(2)" 2>&1 | res | unq)
[ "$TOT" = "$(printf '%.2f' "$AMT")" ] || { echo "FAIL: adjustments total $TOT, bank $AMT (not created)"; exit 1; }

# attach the export: a real click opens the chooser, upload answers it
SN="$K/../../bowery-ubereats/scripts/snapshot.sh"
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
act $R 'open saved deposit' tab-new "https://norms.restaurant365.com/#/form/BankDepositForm/$ID"; sleep 18
playwright-cli -s=$R eval "$(cat "$K/read-deposit.js")" 2>&1 | res | unq > "back-$ISO-$STREAM.json"
# close only a tab this run opened; closing the last one drops Bank Activity
[ "$(playwright-cli -s=$R tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ] && playwright-cli -s=$R tab-close >/dev/null 2>&1
playwright-cli -s=$R tab-select 0 >/dev/null 2>&1
node "$K/check-deposit.js" "$PLAN" "back-$ISO-$STREAM.json" "$FILE"

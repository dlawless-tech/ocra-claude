#!/bin/bash
# Split one Tripleseat payout's existing Bank Deposit and attach the payout PDF.
# Usage: post-payout.sh <r365 session> <tsp session> <store> <po_id> <deposit TransactionId> <pdf name>
# Lines: 253-00 credit charges gross, 401-27 debit refunds, 632-00 debit the rest (fees + rounding).
# Prints MATCH <number> only when the reloaded deposit carries those lines and the PDF.
set -u
S="$1"; TS="$2"; STORE="$3"; PO="$4"; ID="$5"; PDF="$6"
B="playwright-cli -s=$S"; T="playwright-cli -s=$TS"
. "$(dirname "$0")/stores.sh"; store_conf "$STORE"
mkdir -p "pdf/$STORE"; F="pdf/$STORE/$PDF"
ref() { $B snapshot 2>&1 | grep -F "$1" | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2 | head -1; }
open_dep() {
  $B goto "https://bowerygroup.restaurant365.com/#/form/BankDepositForm/00000000-0000-0000-0000-000000000000" >/dev/null 2>&1; sleep 4
  $B goto "https://bowerygroup.restaurant365.com/#/form/BankDepositForm/$ID" >/dev/null 2>&1
  # form fills well after load; wait for the number and the lines
  for i in $(seq 1 20); do sleep 3
    [ "$($B eval "() => !!(document.getElementById('bankDepositNumber')||{}).value && jQuery('#bankDepositDetailsGrid').data('kendoGrid').dataSource.data().length>0" 2>&1 | res)" = "true" ] && return 0
  done
  echo "FAIL: deposit $ID did not load"; exit 1
}
grid() { $B eval "() => jQuery('#bankDepositDetailsGrid').data('kendoGrid').dataSource.data().toJSON().map(r=>r.glAccount.slice(0,6)+'='+Number(r.total).toFixed(2)).sort().join(',')+'|'+document.body.innerText.match(/Deposit Total\s*([\d.,-]+)/)[1].replace(/,/g,'')" 2>&1 | res | tr -d '"'; }

# 1. payout figures
$T goto "https://partypay.paymentsonline.io/payouts/$PORTAL_ACCT/payouts/$PO" >/dev/null 2>&1; sleep 8
read -r GROSS REFUND NET < <($T eval "() => document.body.innerText" 2>&1 | unjson | node -e '
  let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
    const n=v=>(!v||v.trim()==="-")?0:Number(v.replace(/[$,]/g,""));
    const row=k=>(s.split("\n").find(l=>l.startsWith(k+"\t"))||"").split("\t");
    const ch=row("Charges"), rf=row("Refunds"), tot=row("Transactions Total");
    console.log(n(ch[2]).toFixed(2), Math.abs(n(rf[2])).toFixed(2), n(tot[tot.length-1]).toFixed(2));})')
[ -n "${NET:-}" ] && [ "$NET" != "0.00" ] || { echo "FAIL: could not read payout $PO (nothing changed)"; exit 1; }
FEE=$(node -e "console.log(($GROSS-$REFUND-$NET).toFixed(2))")
echo "payout $PO gross $GROSS refund $REFUND fee $FEE net $NET"
node -e "process.exit($FEE<0?1:0)" || { echo "FAIL: negative fee $FEE (nothing changed)"; exit 1; }
WANT=$( { echo "253-00=$GROSS"; [ "$FEE" != "0.00" ] && echo "632-00=-$FEE"; [ "$REFUND" != "0.00" ] && echo "401-27=-$REFUND"; } | sort | paste -sd, )"|$NET"

# 2. print the payout page as one wide page; overflow boxes opened so every column shows
$T resize 1600 1200 >/dev/null 2>&1; sleep 2
$T eval "() => { document.querySelectorAll('*').forEach(e=>{const c=getComputedStyle(e); if(/(auto|scroll|hidden)/.test(c.overflow+c.overflowX+c.overflowY))e.style.overflow='visible'; if(c.maxHeight!=='none')e.style.maxHeight='none'; if(e.scrollHeight>e.clientHeight&&c.height!=='auto'&&e!==document.documentElement&&e!==document.body)e.style.height='auto';}); }" >/dev/null 2>&1
P=$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$F")
$T run-code "async page => { await page.emulateMedia({media:'screen'}); await page.pdf({path:$P, width:'1600px', height:'1500px', printBackground:true, pageRanges:'1'}); return 'ok'; }" >/dev/null 2>&1
[ -s "$F" ] || { echo "FAIL: no pdf $F (nothing changed)"; exit 1; }

# 3. the deposit's lines
open_dep
$B click 'text=Adjustments' >/dev/null 2>&1; sleep 2
HAVE=$(grid)
[ "${HAVE#*|}" = "$NET" ] || { echo "FAIL: deposit total ${HAVE#*|}, payout net $NET (nothing changed)"; exit 1; }
if [ "$HAVE" = "$WANT" ]; then
  echo "lines already right"
elif [ "${HAVE%|*}" = "253-00=$NET" ]; then
  $B click "$(ref 'button "Edit"')" >/dev/null 2>&1; sleep 3
  CELL=$($B snapshot 2>&1 | grep -A1 'gridcell "253-00 - Event Deposit Liability"' | tail -1 | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
  $B click "$CELL" >/dev/null 2>&1; sleep 2
  BOX=$($B snapshot 2>&1 | grep -A2 'gridcell "253-00 - Event Deposit Liability"' | grep textbox | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
  [ -n "$BOX" ] || { echo "FAIL: no 253-00 amount box (nothing saved)"; exit 1; }
  $B fill "$BOX" "$GROSS" >/dev/null 2>&1; $B press Tab >/dev/null 2>&1; sleep 2
  addline() {
    $B click "$(ref 'combobox "Select Account"')" >/dev/null 2>&1; $B press Control+a >/dev/null 2>&1; $B type "$1" >/dev/null 2>&1; sleep 3
    $B click "$(ref "option \"$1 - ")" >/dev/null 2>&1; sleep 1
    # amount box calculator swallows a typed minus; set the form model
    $B eval "() => { const sc=angular.element([...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Add'&&x.offsetParent)).scope(); sc.\$apply(()=>{ sc.gridOptions.bankDepositDetailsGrid.newRowForm.model.amount='-$2'; }); }" >/dev/null 2>&1
    $B click 'button:text-is("Add") >> visible=true' >/dev/null 2>&1; sleep 2
  }
  [ "$FEE" != "0.00" ] && addline 632-00 "$FEE"
  [ "$REFUND" != "0.00" ] && addline 401-27 "$REFUND"
  GOT=$(grid)
  [ "$GOT" = "$WANT" ] || { echo "FAIL: grid $GOT, want $WANT (not saved; reload discards it)"; exit 1; }
  $B click 'button:has-text("Edit Complete")' >/dev/null 2>&1; sleep 8
else
  echo "FAIL: deposit lines $HAVE are neither the plan $WANT nor a single net 253-00 line (nothing changed)"; exit 1
fi

# 4. attach once: a real click opens the chooser, upload answers it
if ! $B eval "$(cat "$(dirname "$0")/read-deposit.js")" 2>&1 | unjson | grep -q "^att=.*Tripleseat"; then
  $B click "$(ref 'button "Upload File"')" >/dev/null 2>&1; $B upload "$F" >/dev/null 2>&1; sleep 8
fi

# 5. verify from a fresh load
open_dep
OUT=$($B eval "$(cat "$(dirname "$0")/read-deposit.js")" 2>&1 | unjson); echo "$OUT"
$B click 'text=Adjustments' >/dev/null 2>&1; sleep 2
ATT=$(echo "$OUT" | sed -n 's/^att=//p')
if [ "$(grid)" = "$WANT" ] && echo ",$ATT," | grep -qF ",$PDF," && echo "$OUT" | head -1 | grep -q " Approved "; then
  echo "MATCH $(echo "$OUT" | head -1 | cut -d' ' -f1) $NET"
else
  echo "FAIL: reloaded deposit does not match $WANT with $PDF attached"; exit 1
fi

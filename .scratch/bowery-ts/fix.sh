#!/bin/bash
# Correct one Tripleseat bank deposit: 253-00 to gross, add 632-00 fee, attach payout PDF.
# Usage: fix.sh <payoutId> <depositId> <gross> <fee> <pdf file name> [refund]
# refund (positive) posts as 401-27 Sales-Comps debit
set -u
PO="$1"; ID="$2"; GROSS="$3"; FEE="$4"; PDF="$5"; REFUND="${6:-0}"
DIR="${DIR:-rosies}"; ACCT="${ACCT:-acct_D1aw91sRVssOqwrmAaP5q}"; F="$DIR/$PDF"
res() { sed -n '/### Result/{n;p;}'; }
T="playwright-cli -s=tsp"; B="playwright-cli -s=bts"
ref() { $B snapshot 2>&1 | grep -F "$1" | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2 | head -1; }
open_dep() {
  $B goto "https://bowerygroup.restaurant365.com/#/form/BankDepositForm/00000000-0000-0000-0000-000000000000" >/dev/null 2>&1; sleep 4
  $B goto "https://bowerygroup.restaurant365.com/#/form/BankDepositForm/$ID" >/dev/null 2>&1; sleep 14
}

# print payout, one wide page
$T goto "https://partypay.paymentsonline.io/payouts/$ACCT/payouts/$PO" >/dev/null 2>&1; sleep 8
$T resize 1600 1200 >/dev/null 2>&1; sleep 2
$T eval "() => { document.querySelectorAll('*').forEach(e=>{const c=getComputedStyle(e); if(/(auto|scroll|hidden)/.test(c.overflow+c.overflowX+c.overflowY))e.style.overflow='visible'; if(c.maxHeight!=='none')e.style.maxHeight='none'; if(e.scrollHeight>e.clientHeight&&c.height!=='auto'&&e!==document.documentElement&&e!==document.body)e.style.height='auto';}); }" >/dev/null 2>&1
P=$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$F")
$T run-code "async page => { await page.emulateMedia({media:'screen'}); await page.pdf({path:$P, width:'1600px', height:'1500px', printBackground:true, pageRanges:'1'}); return 'ok'; }" >/dev/null 2>&1
[ -s "$F" ] || { echo "FAIL: no pdf $F"; exit 1; }

open_dep
# no fee: lines already right, attach only
if [ "$(printf '%.2f' $FEE)" != "0.00" ]; then
$B click 'text=Adjustments' >/dev/null 2>&1; sleep 2
$B click "$(ref 'button "Edit"')" >/dev/null 2>&1; sleep 3
CELL=$($B snapshot 2>&1 | grep -A1 'gridcell "253-00 - Event Deposit Liability"' | tail -1 | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
$B click "$CELL" >/dev/null 2>&1; sleep 2
BOX=$($B snapshot 2>&1 | grep -A2 'gridcell "253-00 - Event Deposit Liability"' | grep textbox | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
[ -n "$BOX" ] || { echo "FAIL: no amount box (nothing saved)"; exit 1; }
$B fill "$BOX" "$GROSS" >/dev/null 2>&1; $B press Tab >/dev/null 2>&1; sleep 2
addline() {
  $B click "$(ref 'combobox "Select Account"')" >/dev/null 2>&1; $B press Control+a >/dev/null 2>&1; $B type "$1" >/dev/null 2>&1; sleep 3
  $B click "$(ref "option \"$1 - ")" >/dev/null 2>&1; sleep 1
  # calculator box swallows a typed minus; set model directly
  $B eval "() => { const sc=angular.element([...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Add'&&x.offsetParent)).scope(); sc.\$apply(()=>{ sc.gridOptions.bankDepositDetailsGrid.newRowForm.model.amount='-$2'; }); }" >/dev/null 2>&1
  $B click 'button:text-is("Add") >> visible=true' >/dev/null 2>&1; sleep 2
}
addline 632-00 "$FEE"
HASREF=$([ "$(printf '%.2f' $REFUND)" != "0.00" ] && echo 1)
[ -n "$HASREF" ] && addline 401-27 "$REFUND"
GOT=$($B eval "() => { const d=jQuery('#bankDepositDetailsGrid').data('kendoGrid').dataSource.data().toJSON(); return d.map(r=>r.glAccount.slice(0,6)+'='+Number(r.total).toFixed(2)).join(',')+'|'+(d.reduce((s,r)=>s+Math.round(r.total*100),0)/100).toFixed(2)+'|'+document.body.innerText.match(/Deposit Total\s*([\d.,-]+)/)[1].replace(/,/g,''); }" 2>&1 | res | tr -d '"')
NET=$(node -e "console.log(($GROSS-$FEE-$REFUND).toFixed(2))")
WANT="253-00=$(printf '%.2f' $GROSS),632-00=-$(printf '%.2f' $FEE)${HASREF:+,401-27=-$(printf '%.2f' $REFUND)}|$NET|$NET"
[ "$GOT" = "$WANT" ] || { echo "FAIL: grid $GOT, want $WANT (not saved)"; exit 1; }
$B click 'button:has-text("Edit Complete")' >/dev/null 2>&1; sleep 8
fi

# attach: real click opens chooser, upload answers it
$B click "$(ref 'button "Upload File"')" >/dev/null 2>&1; $B upload "$F" >/dev/null 2>&1; sleep 8

# verify from a fresh load
open_dep
$B eval "$(cat dep2.js)" 2>&1 | grep '^"' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)))' | grep -v "^undep\|^DIST / 2\|^DIST / 6"

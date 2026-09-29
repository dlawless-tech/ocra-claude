#!/bin/bash
# Key a plan's lines into the open Bank Deposit's Adjustments tab.
# Usage: add-lines.sh <session> <plan.json>
# Prints each line as added, then the grid read back; exits 1 on a line that did not land.
set -u
S="$1"; PLAN="$2"
W='.k-window:has-text("Create Deposit")'
res() { sed -n '/### Result/{n;p;}'; }
SN="$(dirname "$0")/../../bowery-ubereats/scripts/snapshot.sh"
# run a playwright-cli action; stop the run if it errors
act() { local what="$1"; shift; playwright-cli -s=$S "$@" 2>&1 | grep -q '### Error' && { echo "FAIL: $what"; exit 1; }; :; }
MODEL="angular.element([...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Add'&&x.offsetParent)).scope().gridOptions.bankDepositDetailsGrid.newRowForm.model"

act 'Adjustments tab' click "$W [role=tab]:has-text(\"Adjustments\") >> visible=true"; sleep 2
N=$(node -e 'console.log(require(process.argv[1]).lines.length)' "$(cygpath -w "$PWD/$PLAN" 2>/dev/null || echo "$PWD/$PLAN")")
for i in $(seq 0 $((N-1))); do
  IFS=$'\t' read -r ACCT AMT COMMENT < <(node -e 'const l=require(process.argv[1]).lines[+process.argv[2]];console.log([l.account,l.amount.toFixed(2),l.comment].join("\t"))' "$(cygpath -w "$PWD/$PLAN")" "$i")
  act "$ACCT account box" click "$W input[placeholder=\"Select Account\"] >> visible=true"
  playwright-cli -s=$S press Control+a >/dev/null 2>&1; playwright-cli -s=$S type "$ACCT" >/dev/null 2>&1; sleep 3
  # pick the option by its snapshot ref; a CSS click on the popup list times out
  bash "$SN" $S opt.txt; REF=$(grep -E "option \"$ACCT - " opt.txt | head -1 | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
  [ -n "$REF" ] || { echo "FAIL: no $ACCT option"; exit 1; }
  act "$ACCT option" click "$REF"; sleep 1
  # the amount box's calculator swallows a typed minus, so a negative goes straight to the model
  if [ "${AMT#-}" != "$AMT" ]; then
    playwright-cli -s=$S eval "() => { const sc=angular.element([...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Add'&&x.offsetParent)).scope(); sc.\$apply(()=>{ sc.gridOptions.bankDepositDetailsGrid.newRowForm.model.amount='$AMT'; }); }" >/dev/null 2>&1
  else
    playwright-cli -s=$S fill "#newRowAmountInput >> visible=true" "$AMT" >/dev/null 2>&1
  fi
  playwright-cli -s=$S fill "$W input[ng-model=\"gridOptions.bankDepositDetailsGrid.newRowForm.model.comment\"] >> visible=true" "$COMMENT" >/dev/null 2>&1
  GOT=$(playwright-cli -s=$S eval "() => { const m=$MODEL; const a=[...document.querySelectorAll('input[placeholder=\"Select Account\"]')].find(i=>i.offsetParent).value; return [a.split(' ')[0], Number(String(m.amount).replace(/,/g,'')).toFixed(2), m.comment, !!m.location].join('|'); }" 2>&1 | res | tr -d '"')
  [ "$GOT" = "$ACCT|$AMT|$COMMENT|true" ] || { echo "FAIL: line $i form reads $GOT"; exit 1; }
  act "line $i Add" click "$W button:text-is(\"Add\") >> visible=true"; sleep 2
  echo "added $ACCT $AMT $COMMENT"
done
playwright-cli -s=$S eval "() => { const d=jQuery('#bankDepositDetailsGrid').data('kendoGrid').dataSource.data().toJSON(); return d.length+' rows, total '+(d.reduce((s,r)=>s+Math.round(r.total*100),0)/100).toFixed(2); }" 2>&1 | res

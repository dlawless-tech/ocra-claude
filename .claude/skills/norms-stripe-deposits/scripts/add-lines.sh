#!/bin/bash
# Key a plan's lines into the open Bank Deposit's Adjustments tab.
# Usage: add-lines.sh <session> <plan.json>
# Prints each line as added, then checks the grid against the plan; exits 1 on a line that did not land.
set -u
S="$1"; PLAN="$2"
W='.k-window:has-text("Create Deposit")'
res() { sed -n '/### Result/{n;p;}'; }
SN="$(dirname "$0")/../../bowery-ubereats/scripts/snapshot.sh"
# run a playwright-cli action; stop the run if it errors
act() { local what="$1"; shift; playwright-cli -s=$S "$@" 2>&1 | grep -q '### Error' && { echo "FAIL: $what"; exit 1; }; :; }
SCOPE="angular.element([...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Add'&&x.offsetParent)).scope()"
MODEL="$SCOPE.gridOptions.bankDepositDetailsGrid.newRowForm.model"
# location list: number -> id, off the new-row location box
LOCS="(() => { const x=jQuery('#newRowLocationInput').data('kendoComboBox'); return Object.fromEntries((x?x.dataSource.data().toJSON():[]).map(l=>[l.locationNumber,l.locationId.toLowerCase()])); })()"
PW="$(cygpath -w "$PWD/$PLAN" 2>/dev/null || echo "$PWD/$PLAN")"

act 'Adjustments tab' click "$W [role=tab]:has-text(\"Adjustments\") >> visible=true"; sleep 2
N=$(node -e 'console.log(require(process.argv[1]).lines.length)' "$PW")
for i in $(seq 0 $((N-1))); do
  IFS=$'\t' read -r ACCT AMT LOC COMMENT < <(node -e 'const l=require(process.argv[1]).lines[+process.argv[2]];console.log([l.account,l.amount.toFixed(2),l.location,l.comment].join("\t"))' "$PW" "$i")
  act "$ACCT account box" click "$W input[placeholder=\"Select Account\"] >> visible=true"
  playwright-cli -s=$S press Control+a >/dev/null 2>&1; playwright-cli -s=$S type "$ACCT" >/dev/null 2>&1; sleep 3
  # pick the option by its snapshot ref; a CSS click on the popup list times out
  bash "$SN" $S opt.txt; REF=$(grep -E "option \"$ACCT - " opt.txt | head -1 | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
  [ -n "$REF" ] || { echo "FAIL: no $ACCT option"; exit 1; }
  act "$ACCT option" click "$REF"; sleep 1
  # the amount box's calculator swallows a typed minus, so a negative goes straight to the model
  if [ "${AMT#-}" != "$AMT" ]; then
    playwright-cli -s=$S eval "() => { const sc=$SCOPE; sc.\$apply(()=>{ sc.gridOptions.bankDepositDetailsGrid.newRowForm.model.amount='$AMT'; }); }" >/dev/null 2>&1
  else
    playwright-cli -s=$S fill "#newRowAmountInput >> visible=true" "$AMT" >/dev/null 2>&1
  fi
  playwright-cli -s=$S fill "$W input[ng-model=\"gridOptions.bankDepositDetailsGrid.newRowForm.model.comment\"] >> visible=true" "$COMMENT" >/dev/null 2>&1
  # location by id on the model; the combobox text may lag, the model is what Add reads
  OK=$(playwright-cli -s=$S eval "() => { const id=$LOCS['$LOC']; if(!id) return 'no location $LOC'; const sc=$SCOPE; sc.\$apply(()=>{ sc.gridOptions.bankDepositDetailsGrid.newRowForm.model.location=id; }); return 'ok'; }" 2>&1 | res | tr -d '"')
  [ "$OK" = ok ] || { echo "FAIL: line $i $OK"; exit 1; }
  GOT=$(playwright-cli -s=$S eval "() => { const m=$MODEL; const L=$LOCS; const a=[...document.querySelectorAll('input[placeholder=\"Select Account\"]')].find(i=>i.offsetParent).value; return [a.split(' ')[0], Number(String(m.amount).replace(/,/g,'')).toFixed(2), Object.keys(L).find(k=>L[k]===String(m.location).toLowerCase()), m.comment].join('|'); }" 2>&1 | res | tr -d '"')
  [ "$GOT" = "$ACCT|$AMT|$LOC|$COMMENT" ] || { echo "FAIL: line $i form reads $GOT"; exit 1; }
  act "line $i Add" click "$W button:text-is(\"Add\") >> visible=true"; sleep 2
  echo "added $ACCT $AMT $LOC $COMMENT"
done
# grid against plan, account|cents|location|comment, before anything is saved
BACK=$(playwright-cli -s=$S eval "() => { const L=$LOCS; return JSON.stringify(jQuery('#bankDepositDetailsGrid').data('kendoGrid').dataSource.data().toJSON().map(r=>({account:String(r.glAccount||'').split(' ')[0], amount:r.total, location:Object.keys(L).find(k=>L[k]===String(r.locationId||r.location).toLowerCase())||String(r.location||'').split(' ')[0], comment:r.comment||''}))); }" 2>&1 | res)
node -e '
const plan=require(process.argv[1]).lines, back=JSON.parse(JSON.parse(process.argv[2]));
const k=l=>[l.account,Math.round(l.amount*100),l.location,String(l.comment).trim()].join("|");
const w=plan.map(k).sort(), g=back.map(k).sort();
const bad=w.filter(x=>!g.includes(x)).map(x=>"missing "+x).concat(g.filter(x=>!w.includes(x)).map(x=>"extra "+x));
if(bad.length||w.length!==g.length){console.log("FAIL: grid differs from plan\n"+bad.join("\n"));process.exit(1)}
console.log(g.length+" rows match plan")' "$PW" "$BACK"

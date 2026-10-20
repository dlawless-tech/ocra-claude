#!/bin/bash
# unclear.sh <key> <recId> : uncheck the listed detail ids, report totals
set -u; S=brec; D=.scratch/bowery-bank-rec-1004; K=$1; ID=$2
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
IDS=$(node -e 'console.log(JSON.stringify(JSON.parse(require("fs").readFileSync(process.argv[1])).'$K'))' $D/unclear.json)
playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/BankReconciliationForm/$ID" >/dev/null 2>&1; sleep 30
playwright-cli -s=$S eval "() => { const ids=new Set($IDS); let n=0; for (const id of ['ChecksWithdrawalsGrid','DepositsOtherCreditsGrid']) { const g=jQuery('#'+id).data('kendoGrid'); g.dataSource.data().forEach(r=>{ if(!ids.has(r.transactionDetailId)) return; const cb=jQuery('#'+id+' tr[data-uid='+r.uid+'] input[type=checkbox]')[0]; if(cb && cb.checked){ cb.click(); n++; } }); } return n + ' unchecked of ' + ids.size + ' | ' + document.body.innerText.match(/Cleared Balance[\s\S]{0,80}/)[0].replace(/\s+/g,' '); }" 2>&1 | res

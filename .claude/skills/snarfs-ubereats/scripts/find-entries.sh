#!/bin/bash
# Print the UberEats entries dated one Sunday as "location|TransactionId|status|amount|attachment", from All Transactions' data source.
# usage: find-entries.sh <session> <Sunday M/D/YYYY>
set -u
S=$1; DT=$2
res() { sed -n '/### Result/{n;p;}'; }
while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
# pushState only works from a /react route; from a form hash it drops the session
playwright-cli -s=$S goto https://snarfsstl.restaurant365.com/react/home >/dev/null 2>&1; sleep 15
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); dispatchEvent(new PopStateEvent('popstate')); return 1 }" >/dev/null 2>&1
R=nogrid
for i in 1 2 3 4 5 6; do sleep 15
  R=$(playwright-cli -s=$S eval "async () => { const docs=[]; const walk=d=>{docs.push(d); for(const f of d.querySelectorAll('iframe')){try{f.contentDocument&&walk(f.contentDocument)}catch(e){}}}; walk(document);
    for (const d of docs){ const jq=d.defaultView.jQuery; if(!jq) continue; const g=jq('[data-role=grid]').data('kendoGrid'); if(!g) continue;
      g.dataSource.filter({field:'Number',operator:'contains',value:'UberEats'}); await new Promise(r=>setTimeout(r,12000));
      return g.dataSource.view().filter(x=>new Date(x.Date).toLocaleDateString('en-US')==='$DT').map(x=>[x.Location,x.TransactionId,x.ApprovalStatus,x.Amount,x.Attachment||''].join('|')).join(';') || 'none'; }
    return 'nogrid' }" 2>&1 | res | tr -d '"')
  [ "$R" != nogrid ] && [ -n "$R" ] && break
done
{ [ "$R" = nogrid ] || [ -z "$R" ]; } && { echo "FAIL: All Transactions grid did not load"; exit 1; }
echo "$R" | tr ';' '\n'

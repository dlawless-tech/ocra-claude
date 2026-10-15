#!/bin/bash
# Print the Door entries dated one Sunday as "location|TransactionId|status|amount", read from All Transactions' data source.
# usage: find-entries.sh <session> <Sunday M/D/YYYY>
set -u
S=$1; DT=$2
res() { sed -n '/### Result/{n;p;}'; }
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); dispatchEvent(new PopStateEvent('popstate')); return 1 }" >/dev/null 2>&1
for i in 1 2 3 4 5 6; do sleep 15
  R=$(playwright-cli -s=$S eval "async () => { const docs=[]; const walk=d=>{docs.push(d); for(const f of d.querySelectorAll('iframe')){try{f.contentDocument&&walk(f.contentDocument)}catch(e){}}}; walk(document);
    for (const d of docs){ const jq=d.defaultView.jQuery; if(!jq) continue; const g=jq('[data-role=grid]').data('kendoGrid'); if(!g) continue;
      g.dataSource.filter({field:'Number',operator:'contains',value:'Door'}); await new Promise(r=>setTimeout(r,10000));
      return g.dataSource.view().filter(x=>new Date(x.Date).toLocaleDateString('en-US')==='$DT').map(x=>[x.Location,x.TransactionId,x.ApprovalStatus,x.Amount,JSON.stringify(x.Attachment??x.Attachments??'')].join('|')).join(';') || 'none'; }
    return 'nogrid' }" 2>&1 | res | tr -d '"')
  [ "$R" != nogrid ] && [ -n "$R" ] && break
done
[ "$R" = nogrid ] && { echo "FAIL: All Transactions grid did not load"; exit 1; }
echo "$R" | tr ';' '\n'

#!/bin/bash
# Dump every All Transactions row whose Number contains "Uber": date|number|type|location|id|status|amount|attachment
set -u
S=$1
res() { sed -n '/### Result/{n;p;}'; }
playwright-cli -s=$S goto https://snarfsstl.restaurant365.com/react/home >/dev/null 2>&1; sleep 15
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); dispatchEvent(new PopStateEvent('popstate')); return 1 }" >/dev/null 2>&1
R=nogrid
for i in 1 2 3 4 5 6; do sleep 15
  R=$(playwright-cli -s=$S eval "async () => { const docs=[]; const walk=d=>{docs.push(d); for(const f of d.querySelectorAll('iframe')){try{f.contentDocument&&walk(f.contentDocument)}catch(e){}}}; walk(document);
    for (const d of docs){ const jq=d.defaultView.jQuery; if(!jq) continue; const g=jq('[data-role=grid]').data('kendoGrid'); if(!g) continue;
      g.dataSource.pageSize(2000); g.dataSource.filter({field:'Number',operator:'contains',value:'Uber'}); await new Promise(r=>setTimeout(r,15000));
      return g.dataSource.view().map(x=>[new Date(x.Date).toLocaleDateString('en-US'),x.Number,x.Type,x.Location,x.TransactionId,x.ApprovalStatus,x.Amount,x.Attachment||''].join('|')).join(';;') || 'none'; }
    return 'nogrid' }" 2>&1 | res | tr -d '"')
  [ "$R" != nogrid ] && [ -n "$R" ] && break
done
echo "$R" | sed 's/;;/\n/g'

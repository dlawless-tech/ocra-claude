#!/bin/bash
# List the Credit Card Fees journal entries from All Transactions, newest first, read from the grid's server data.
# usage: find-entries.sh <session>
# Prints one JSON array of {date, status, amount, comment, id}. Run from a loaded React page (the home dashboard).
S="$1"
res() { sed -n '/### Result/,/### Ran/p' | sed '1d;$d'; }
playwright-cli -s=$S goto "https://cucinacolore.restaurant365.com/react/accounting" >/dev/null 2>&1; sleep 10
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); window.dispatchEvent(new PopStateEvent('popstate')); }" >/dev/null 2>&1
for i in $(seq 1 12); do sleep 5
  OUT=$(playwright-cli -s=$S eval "async () => {
    const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
    const d=seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
    if(!d) return '';
    const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
    g.dataSource.pageSize(1000);
    g.dataSource.filter({logic:'and',filters:[{field:'Number',operator:'eq',value:'Credit Card Fees'}]});
    await new Promise(r=>setTimeout(r,8000));
    const dt=x=>{const D=new Date(x.Date);return (D.getMonth()+1)+'/'+D.getDate()+'/'+D.getFullYear();};
    return JSON.stringify(g.dataSource.view().map(x=>({date:dt(x),status:x.ApprovalStatus,amount:x.Amount,comment:x.Comment,id:x.TransactionId})));
  }" 2>&1 | res)
  case "$OUT" in '"['*) echo "$OUT" | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")))'; echo; exit 0;; esac
done
echo "FAIL nogrid"; exit 1

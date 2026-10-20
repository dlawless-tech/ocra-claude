#!/bin/bash
# Find the week's Payroll and Tips entries in All Transactions.
# usage: find-entries.sh <session> <week end yyyy-MM-dd>
# Prints one JSON object: {payroll:[{status,amount,id}], tips:[...]}
set -u
S="$1"; WE="$2"
res() { sed -n '/### Result/,/### Ran/p' | sed -n 2p; }
# off a /react/ page a full navigation logs out, so route the SPA instead
case "$(playwright-cli -s=$S eval "() => location.pathname" 2>&1 | res | tr -d '"')" in /react/*) : ;;
  *) playwright-cli -s=$S goto https://cucinacolore.restaurant365.com/react/accounting >/dev/null 2>&1; sleep 15
     bash "$(dirname "$0")/r365-login.sh" "$S" >/dev/null || { echo "FAIL: login"; exit 1; }; sleep 20;; esac
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); dispatchEvent(new PopStateEvent('popstate')); return 1; }" >/dev/null 2>&1
for i in 1 2 3 4; do
  sleep 20
  R=$(playwright-cli -s=$S eval "async () => {
const seen=[];const walk=(d)=>{seen.push(d);for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}};walk(document);
const d=seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'nogrid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.pageSize(500);
g.dataSource.filter({logic:'or',filters:[{field:'Number',operator:'eq',value:'Payroll'},{field:'Number',operator:'eq',value:'Tips'}]});
await new Promise(r=>setTimeout(r,10000));
const dt=x=>{const D=new Date(x.Date);return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0');};
const pick=n=>g.dataSource.view().filter(x=>x.Number===n && dt(x)==='$WE' && /^Journal Entry/.test(x.Name||'')).map(x=>({status:x.ApprovalStatus,amount:x.Amount,id:x.TransactionId}));
return JSON.stringify({payroll:pick('Payroll'),tips:pick('Tips')});
}" 2>&1 | res)
  [ "$R" != '"nogrid"' ] && [ -n "$R" ] && break
done
case "$R" in '"{'*) node -e 'console.log(JSON.parse(process.argv[1]))' "$R";;
  *) echo "FAIL: no grid ($R)"; exit 1;; esac

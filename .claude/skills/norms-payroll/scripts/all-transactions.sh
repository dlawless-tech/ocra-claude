#!/bin/bash
# List the latest Payroll entries from All Transactions: date, number, location, status, amount, id.
# usage: all-transactions.sh <session>
# Routes the SPA from a /react/ page; a full navigation logs the session out.
set -u
S="$1"
res() { sed -n "/### Result/,/### Ran/p" | sed -n 2p | tr -d "\""; }
case "$(playwright-cli -s=$S eval "() => location.pathname" 2>&1 | res)" in /react/*) : ;;
  *) playwright-cli -s=$S eval "() => { location.href='/react/home'; return 1; }" >/dev/null 2>&1; sleep 15
     bash "$(dirname "$0")/../../norms-doordash/scripts/r365-login.sh" "$S" || exit 1; sleep 15;; esac
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); dispatchEvent(new PopStateEvent('popstate')); return location.href; }" >/dev/null 2>&1
sleep 40
playwright-cli -s=$S eval "async () => {
const seen=[];const walk=(d)=>{seen.push(d);for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}};walk(document);
const d=seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'no grid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number',operator:'contains',value:'payroll'});
await new Promise(r=>setTimeout(r,8000));
const dt=x=>{const D=new Date(x.Date);return (D.getMonth()+1)+'/'+D.getDate()+'/'+D.getFullYear();};
return g.dataSource.view().slice(0,8).map(x=>[dt(x),x.Number,x.Location,x.ApprovalStatus,x.Amount,x.TransactionId].join(' ; ')).join(' | ');
}" 2>&1 | sed -n '/### Result/,/### Ran/p' | sed -n '2p' | tr -d '"' | tr '|' '\n'

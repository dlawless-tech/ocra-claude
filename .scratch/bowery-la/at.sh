#!/bin/bash
# List the Labor Allocation entries from All Transactions: date, status, amount, number, id.
# usage: all-transactions.sh <session>
# Routes the SPA to the page directly; a goto on the /react URL drops the session.
set -u
S="$1"
res() { sed -n "/### Result/,/### Ran/p" | sed -n 2p | tr -d "\""; }
case "$(playwright-cli -s=$S eval "() => location.pathname" 2>&1 | res)" in /react/*) : ;;
  *) playwright-cli -s=$S eval "() => { location.href='/react/home'; return 1; }" >/dev/null 2>&1; sleep 15
     bash /c/Users/trici/ocra-claude/.claude/skills/bowery-ubereats/scripts/r365-login.sh "$S" || exit 1; sleep 15;; esac
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); dispatchEvent(new PopStateEvent('popstate')); return location.href; }" >/dev/null 2>&1
sleep 40
playwright-cli -s=$S eval "async () => {
const seen=[];const walk=(d)=>{seen.push(d);for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}};walk(document);
const d=seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'no grid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number',operator:'contains',value:'Labor Allocation'});
await new Promise(r=>setTimeout(r,8000));
const dt=x=>{const D=new Date(x.Date);return (D.getMonth()+1)+'/'+D.getDate()+'/'+D.getFullYear();};
return g.dataSource.view().slice().sort((a,b)=>new Date(b.Date)-new Date(a.Date)).slice(0,6).map(x=>[dt(x),x.ApprovalStatus,x.Amount,x.Number,x.TransactionId].join(' ; ')).join(' | ');
}" 2>&1 | sed -n '/### Result/,/### Ran/p' | sed -n '2p' | tr -d '"' | tr '|' '\n'

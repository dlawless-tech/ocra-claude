#!/bin/bash
# List every Journal Entry numbered exactly Inventory: date ; location ; status ; amount ; id
# Usage: entries.sh <session>   (tab 0 must be R365)
set -u
S="$1"; SK="$(cd "/c/Users/trici/ocra-claude/.claude/skills" && pwd)"
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S eval "() => { location.href='/react/home'; return 1; }" >/dev/null 2>&1; sleep 15
bash "$SK/bowery-ubereats/scripts/r365-login.sh" $S >/dev/null || { echo "FAIL: login"; exit 1; }; sleep 15
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); dispatchEvent(new PopStateEvent('popstate')); return 1; }" >/dev/null 2>&1; sleep 40
playwright-cli -s=$S eval "async () => {
const seen=[];const walk=(d)=>{seen.push(d);for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}};walk(document);
const d=seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'FAIL: no grid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number',operator:'contains',value:'Vandy'});
await new Promise(r=>setTimeout(r,8000));
const dt=x=>{const D=new Date(x.Date);return (D.getMonth()+1)+'/'+D.getDate()+'/'+D.getFullYear();};
return g.dataSource.view().map(x=>[dt(x),x.Location,x.ApprovalStatus,x.Amount,x.Number,x.Type,x.TransactionId].join(' ; ')).join(' | ');
}" 2>&1 | sed -n '/### Result/{n;p;}' | tr -d '"' | tr '|' '\n' | sed 's/^ //'

#!/bin/bash
# list UberEats Fees entries: date ; location ; status ; amount ; id
S=fue-r365; D=sk/fare-ubereats/scripts
bash $D/r365-login.sh $S || exit 1
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S goto https://fare.restaurant365.com/react/home >/dev/null 2>&1; sleep 15
bash $D/r365-login.sh $S >/dev/null || exit 1; sleep 15
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); dispatchEvent(new PopStateEvent('popstate')); return 1; }" >/dev/null 2>&1; sleep 40
playwright-cli -s=$S eval "async () => {
const seen=[];const walk=(d)=>{seen.push(d);for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}};walk(document);
const d=seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'FAIL: no grid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number',operator:'eq',value:'UberEats Fees'});
await new Promise(r=>setTimeout(r,8000));
const dt=x=>{const D=new Date(x.Date);return (D.getMonth()+1)+'/'+D.getDate()+'/'+D.getFullYear();};
return g.dataSource.view().filter(x=>dt(x)==='10/11/2026').map(x=>[dt(x),x.Location,x.ApprovalStatus,x.Amount,x.TransactionId,(x.Attachments||x.AttachmentNames||'')].join(' ; ')).join(' | ') || 'none';
}" 2>&1 | sed -n '/### Result/{n;p;}' | tr -d '"' | tr '|' '\n'

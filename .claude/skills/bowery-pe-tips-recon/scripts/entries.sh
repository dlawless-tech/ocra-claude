#!/bin/bash
# List every Journal Entry numbered exactly <number>: date ; location ; status ; amount ; id
# usage: entries.sh <session> "<number>"
set -u
S=$1; NUM=$2; SK="$(cd "$(dirname "$0")/../.." && pwd)"
jsq() { node -e 'const B=String.fromCharCode(92),Q=String.fromCharCode(39),D=String.fromCharCode(34);process.stdout.write(Q+JSON.stringify(process.argv[1]).slice(1,-1).split(B+D).join(B+"x22").split(Q).join(B+"x27")+Q)' "$1"; }
N=$(jsq "$NUM")
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S goto https://bowerygroup.restaurant365.com/react/home >/dev/null 2>&1; sleep 15
bash "$SK/bowery-ubereats/scripts/r365-login.sh" $S >/dev/null || { echo "FAIL: login"; exit 1; }; sleep 15
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); dispatchEvent(new PopStateEvent('popstate')); return 1; }" >/dev/null 2>&1; sleep 40
playwright-cli -s=$S eval "async () => {
const seen=[];const walk=(d)=>{seen.push(d);for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}};walk(document);
const d=seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'FAIL: no grid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number',operator:'eq',value:$N});
await new Promise(r=>setTimeout(r,8000));
const dt=x=>{const D=new Date(x.Date);return (D.getMonth()+1)+'/'+D.getDate()+'/'+D.getFullYear();};
return g.dataSource.view().map(x=>[dt(x),x.Location,x.ApprovalStatus,x.Amount,x.TransactionId].join(' ; ')).join(' | ');
}" 2>&1 | sed -n '/### Result/{n;p;}' | tr -d '"' | tr '|' '\n' | sed 's/^ //; s/\x27/'"'"'/g'

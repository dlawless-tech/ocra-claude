#!/bin/bash
# List a store's Paysafe bank deposits in R365 between two dates.
# Usage: find-deposits.sh <session> <store> <from YYYY-MM-DD> <to YYYY-MM-DD>
# Output: <number> | <date YYYY-MM-DD> | <amount> | <transaction id> | <comment>
set -u
S="$1"; STORE="$2"; FROM="$3"; TO="$4"; B="playwright-cli -s=$S"
. "$(dirname "$0")/stores.sh"; store_conf "$STORE"
$B goto "https://bowerygroup.restaurant365.com/react/accounting/legacy/AllTransactions" >/dev/null 2>&1; sleep 30
# grid lives a frame down; filter its data source server side, 1000 rows a page
$B eval "async () => { const docs=[]; const walk=w=>{try{docs.push(w.document);for(const f of w.document.querySelectorAll('iframe,frame')){try{walk(f.contentWindow)}catch(e){}}}catch(e){}}; walk(window);
const d=docs.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid')); if(!d) return 'FAIL: no grid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); g.dataSource.pageSize(1000);
g.dataSource.filter({logic:'and',filters:[{field:'Number',operator:'startswith',value:'BD'},{field:'Location',operator:'contains',value:'$LOC'},{field:'Comment',operator:'contains',value:'Paysafe'}]});
await new Promise(r=>setTimeout(r,10000));
const ymd=x=>{const D=new Date(x);return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0')};
return g.dataSource.view().filter(x=>ymd(x.Date)>='$FROM'&&ymd(x.Date)<='$TO').sort((a,b)=>new Date(a.Date)-new Date(b.Date)).map(x=>[x.Number,ymd(x.Date),x.Amount.toFixed(2),x.TransactionId,(x.Comment||'').slice(0,40)].join(' | ')).join('\n'); }" 2>&1 | unjson

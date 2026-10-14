#!/bin/bash
# Pull every Grubhub transaction (orders, refunds, payouts) for The Sink from the accounting API behind
# Financials > Transactions, in Denver days, one week per call (a long range is refused).
# usage: gh-transactions.sh <session> <start YYYY-MM-DD> <end YYYY-MM-DD exclusive> <out.json>
set -u
S=$1; START=$2; END=$3; OUT=$4
JS="async () => { const H={authorization:'Bearer '+sessionStorage.getItem('authToken'),accept:'application/json'}; const rests=JSON.parse(localStorage.getItem('associatedRestaurants')); const ids=rests.map(r=>r.id).join(','); const all=[]; const errs=[]; const add=(a,n)=>new Date(Date.parse(a+'T12:00:00Z')+n*864e5).toISOString().slice(0,10); for(let s='$START'; s<'$END'; s=add(s,7)){ const e=add(s,7)<'$END'?add(s,7):'$END'; const t=await (await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/v1/'+ids+'/transactions?timeZone=America/Denver&channelGroup=&startDate='+s+'&endDate='+e,{headers:H})).text(); try{ all.push(...JSON.parse(t)); }catch(x){ errs.push(s+': '+t.slice(0,120)); } } return JSON.stringify({rests,errs,tx:all}); }"
playwright-cli -s=$S eval "$JS" > "$OUT.raw" 2>&1
node -e 'const t=require("fs").readFileSync(process.argv[1],"utf8");const m=t.match(/### Result\n([\s\S]*?)\n### Ran/);if(!m){console.log("FAIL: "+t.slice(0,300));process.exit(1)}const o=JSON.parse(JSON.parse(m[1]));if(o.errs.length){console.log("FAIL: "+o.errs.join("; "));process.exit(1)}require("fs").writeFileSync(process.argv[2],JSON.stringify(o));console.log(o.rests.map(r=>r.id+" "+r.displayName).join("; ")+": "+o.tx.length+" transactions")' "$OUT.raw" "$OUT" && rm -f "$OUT.raw"

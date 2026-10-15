#!/bin/bash
# Pull Snarf's payouts for a payout-date range, each with its covered window and breakdown.
# usage: dd-payouts.sh <session> <first payout date YYYY-MM-DD> <last payout date YYYY-MM-DD> <out.json>
# DoorDash serves about the last six months only. Run on a merchant-portal page of a logged-in session.
set -u
S=$1; A=$2; B=$3; OUT=$4; B1=$(date -d "$B +1 day" +%F)
res() { sed -n '/### Result/{n;p;}'; }
R=$(playwright-cli -s=$S eval "async () => {
  const stores={167545:'MX',167548:'SLU',151336:'Skinker',863421:'Page',25996076:'Fenton',28105709:'Kirkwood',42367837:'Spirit'}; const pays=[]; let off=0, count=0;
  do { const r=await fetch('/merchant-analytics-service/api/v2/payout_summaries',{method:'POST',headers:{'content-type':'application/json',timezone:'America/Chicago'},
      body:JSON.stringify({storeIds:[],businessIds:[404902],organizations:[],dateRange:{startDate:'${A}T05:00:00.000Z',endDate:'${B1}T04:59:59.999Z'},filtersList:[{channelsList:[3]}],storeFilterGranularity:3,page:{offset:off,limit:100}})});
    if(!r.ok) return 'FAIL: payout_summaries HTTP '+r.status; const j=await r.json(); count=j.count; pays.push(...j.summariesList); off+=100; if(!j.summariesList.length) break; } while(off<count);
  const out=[]; const m=s=>+String(s).replace(/[\$,]/g,'');
  for(const p of pays.filter(p=>stores[p.storeId] && (!window.__only||stores[p.storeId]===window.__only))){
    const r=await fetch('/merchant-analytics-service/api/v1/payout_transactions_summary?businessId='+p.businessId+'&entityType=business&payoutId='+p.payoutId+'&storeId='+p.storeId,{headers:{timezone:'America/Chicago'}});
    if(!r.ok) return 'FAIL: summary '+p.payoutId+' HTTP '+r.status; const j=(await r.json()).payoutTransactionsSummary;
    const per=j.headerTabs[0].tabTotal.tabTotalMonetary.percentageComparison?.dateRangeComparison?.currentPeriod; if(!per) return 'FAIL: no window on '+p.payoutId;
    const it={}; for(const t of j.summaryTabs) for(const i of t.tabItems) it[t.displayName+'|'+i.displayName]=(i.tabTotal?.tabTotalMonetary?.currentValue?.unitAmount||0)/100;
    out.push({store:stores[p.storeId],id:p.payoutId,date:p.payoutDate,status:p.payoutStatus,start:per.startTime,end:per.endTime,sales:m(p.sales),fees:m(p.commissionAndFees),mkt:m(p.marketingSpend),amd:m(p.amendments),net:m(p.netPayout),items:it});
  }
  window.__ddp=out; return 'ok '+out.length; }" 2>&1 | res)
case "$R" in *ok*) : ;; *) echo "FAIL: $R"; exit 1;; esac
playwright-cli -s=$S eval "() => JSON.stringify(window.__ddp)" 2>&1 | res | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{require("fs").writeFileSync(process.argv[1],JSON.stringify(JSON.parse(JSON.parse(s)),null,1));})' "$OUT"
echo "$R payouts -> $OUT"

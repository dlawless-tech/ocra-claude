async () => {
  const body={storeIds:[],businessIds:[4360],organizations:[],dateRange:{startDate:'2026-09-08T07:00:00.000Z',endDate:'2026-10-04T06:59:59.999Z'},filtersList:[],storeFilterGranularity:null,page:{offset:0,limit:200}};
  const r=await fetch('/merchant-analytics-service/api/v2/payout_summaries',{method:'POST',headers:{'content-type':'application/json','accept-language':'en-US',timezone:'America/Los_Angeles'},body:JSON.stringify(body),credentials:'include'});
  return await r.text();
}

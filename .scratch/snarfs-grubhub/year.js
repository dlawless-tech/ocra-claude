async () => {
const H={authorization:'Bearer '+sessionStorage.getItem('authToken'),accept:'application/json'};
const rests=JSON.parse(localStorage.getItem('associatedRestaurants'));
const all=[]; const log=[];
for (let m=0;m<10;m++){ const s=new Date(Date.UTC(2025,11,29+0)); }
const starts=[]; for(let d=Date.UTC(2025,11,28); d<Date.UTC(2026,9,14); d+=14*864e5) starts.push(d);
for (const s of starts){ const e=Math.min(s+14*864e5,Date.UTC(2026,9,14)); const f=x=>new Date(x).toISOString().slice(0,10);
  const r=await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/v1/'+rests.map(r=>r.id).join(',')+'/transactions?timeZone=America/Chicago&channelGroup=&startDate='+f(s)+'&endDate='+f(e),{headers:H});
  if(!r.ok){log.push(f(s)+' '+r.status);continue;} const j=await r.json(); log.push(f(s)+' '+j.length); all.push(...j); }
return JSON.stringify({log,all});
}

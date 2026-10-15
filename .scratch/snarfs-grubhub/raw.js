async () => {
const H={authorization:'Bearer '+sessionStorage.getItem('authToken'),accept:'application/json'};
const rests=JSON.parse(localStorage.getItem('associatedRestaurants'));
const tx=await (await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/v1/'+rests.map(r=>r.id).join(',')+'/transactions?timeZone=America/Chicago&channelGroup=&startDate=2026-10-04&endDate=2026-10-14',{headers:H})).json();
return JSON.stringify(tx);
}

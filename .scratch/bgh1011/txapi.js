async () => {
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const rests = JSON.parse(localStorage.getItem('associatedRestaurants'));
const r = await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/v1/' + rests.map(r => r.id).join(',') + '/transactions?timeZone=America/New_York&channelGroup=&startDate=2026-10-06&endDate=2026-10-13', {headers: H});
return JSON.stringify(await r.json());
}

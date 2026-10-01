async () => {
const tok = sessionStorage.getItem('authToken'); if (!tok) return 'STOP: no authToken; keys ' + Object.keys(sessionStorage).join(',');
const H = {authorization: 'Bearer ' + tok, accept: 'application/json'};
const rests = JSON.parse(localStorage.getItem('associatedRestaurants') || '[]');
const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';
const ac = new AbortController(); setTimeout(() => ac.abort(), 25000);
const r = await fetch(base + rests.map(r => r.id).join(',') + '/deposits/summary?startTime=2026-09-02T00:00:00.000Z&endTime=2026-09-15T06:59:59.000Z', {headers: H, signal: ac.signal});
const j = await r.json();
window.__sum = j;
return JSON.stringify({rests: rests.map(x=>[x.id,x.name,x.streetAddress]), keys: Object.keys(j), sample: JSON.stringify(j).slice(0, 2500)});
}

async () => {
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';
const out = {};
for (const [rid, deps] of Object.entries(window.__sum)) for (const d of deps) {
  const ac = new AbortController(); setTimeout(() => ac.abort(), 25000);
  const r = await fetch(base + rid + '/deposits/' + d.restaurant_distribution_id, {headers: H, signal: ac.signal});
  (out[rid] = out[rid] || []).push(await r.json());
}
window.__det = out;
return JSON.stringify(out);
}

async () => {
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const rests = JSON.parse(localStorage.getItem('associatedRestaurants'));
const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';
const s = await (await fetch(base + rests.map(r => r.id).join(',') + '/deposits/summary?startTime=2026-09-15T00:00:00.000Z&endTime=2026-10-02T03:59:59.000Z', {headers: H})).json();
const ny = t => new Date(t).toLocaleDateString('en-CA', {timeZone: 'America/New_York'});
const out = [];
for (const rid of Object.keys(s)) for (const d of s[rid]) {
  const f = await (await fetch(base + rid + '/deposits/' + d.restaurant_distribution_id, {headers: H})).json();
  const tx = f.associated_transactions || [];
  const days = {}; const types = {}; const odd = [];
  for (const t of tx) { const k = ny(t.transaction_time); days[k] = Math.round(((days[k]||0) + (t.prepaid_amount||0))); types[t.transaction_type]=(types[t.transaction_type]||0)+1; if (t.transaction_type !== 'PREPAID_ORDER') odd.push(JSON.stringify(t).slice(0,400)); }
  const T = f.totals || {};
  const sum = Object.values(T).reduce((a,b)=>a+(typeof b==='number'?b:0),0);
  out.push({rest: rests.find(r => String(r.id) === rid).name, sid: f.short_distribution_id, created: d.created_date, eff: d.effective_date, total: f.total, totals: T, check: sum - f.total, days, types, odd});
}
return out;
}

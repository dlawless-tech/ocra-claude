async () => {
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';
const ids = ['15123680','7572456','11996496','9817760','12700328'];
const ac = new AbortController(); setTimeout(() => ac.abort(), 25000);
const j = await (await fetch(base + ids.join(',') + '/deposits/summary?startTime=2026-08-20T00:00:00.000Z&endTime=2026-09-30T23:59:59.000Z', {headers: H, signal: ac.signal})).json();
const out = [];
for (const [rid, deps] of Object.entries(j)) for (const d of deps) {
  const a2 = new AbortController(); setTimeout(() => a2.abort(), 25000);
  const f = await (await fetch(base + rid + '/deposits/' + d.restaurant_distribution_id, {headers: H, signal: a2.signal})).json();
  const tx = f.associated_transactions || [];
  const ny = t => new Date(t).toLocaleDateString('en-US', {timeZone: 'America/New_York'});
  out.push([rid, f.short_distribution_id, 'paid ' + ny(f.effective_date), f.total / 100, tx.length + ' tx', tx.length ? ny(tx[0].transaction_time) + '..' + ny(tx[tx.length - 1].transaction_time) : ''].join(' | '));
}
return Object.keys(j).join(',') + '\n' + out.join('\n');
}

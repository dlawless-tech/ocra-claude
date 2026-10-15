async () => {
// Every Grubhub transaction for all Snarf's stores from __START__ to __END__ (YYYY-MM-DD, both inclusive, Central time), raw, as JSON.
// Pulled in two-week chunks so a long window stays under the API's page size. Swap __START__/__END__ with sed first.
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const ids = JSON.parse(localStorage.getItem('associatedRestaurants')).map(r => r.id).join(',');
const f = x => new Date(x).toISOString().slice(0, 10);
const stop = Date.parse('__END__T00:00:00Z') + 864e5, out = new Map();
for (let s = Date.parse('__START__T00:00:00Z'); s < stop; s += 14 * 864e5) {
  const r = await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/v1/' + ids + '/transactions?timeZone=America/Chicago&channelGroup=&startDate=' + f(s) + '&endDate=' + f(Math.min(s + 14 * 864e5, stop)), {headers: H});
  if (!r.ok) return 'FAIL ' + r.status + ' at ' + f(s);
  for (const t of await r.json()) out.set(t.transaction_id, t);
}
return JSON.stringify([...out.values()]);
}

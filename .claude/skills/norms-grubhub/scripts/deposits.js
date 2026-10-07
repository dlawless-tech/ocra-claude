async () => {
// Every deposit for the estate, as JSON. Swap __START__/__END__ (YYYY-MM-DD, paid dates) with sed first.
// days: prepaid cents by Los Angeles sales day, which places each deposit in its period.
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const rests = JSON.parse(localStorage.getItem('associatedRestaurants'));
const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';
const la = t => new Date(t).toLocaleDateString('en-CA', {timeZone: 'America/Los_Angeles'});
const out = [];
for (let i = 0; i < rests.length; i += 10) {
  const ids = rests.slice(i, i + 10).map(r => r.id);
  const s = await (await fetch(base + ids.join(',') + '/deposits/summary?startTime=__START__T00:00:00.000Z&endTime=__END__T06:59:59.000Z', {headers: H})).json();
  for (const rid of Object.keys(s)) for (const d of s[rid]) {
    const f = await (await fetch(base + rid + '/deposits/' + d.restaurant_distribution_id, {headers: H})).json();
    const days = {}; const odd = [];
    for (const t of (f.associated_transactions || [])) {
      const k = la(t.transaction_time); days[k] = (days[k] || 0) + (t.prepaid_amount || 0);
      if (!/ONLINE|PREPAID_ORDER/.test(t.transaction_type) || /REFUND|CREDIT|ADJ/.test(t.transaction_type)) odd.push([t.transaction_type, k, t.prepaid_amount].join(' '));
    }
    const T = f.totals || {};
    const sum = Object.values(T).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    const r = rests.find(z => String(z.id) === rid);
    out.push({street: r.streetAddress, city: r.city, sid: f.short_distribution_id, created: d.created_date, eff: d.effective_date, total: f.total, T, check: sum - f.total, days, odd});
  }
}
return JSON.stringify(out);
}

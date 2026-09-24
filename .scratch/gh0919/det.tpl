async () => {
  const deps = __DEPS__;
  const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json', 'content-type': 'application/json'};
  const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';
  const res = await Promise.all(deps.map(async ([r, id]) => {
    const x = await fetch(base + r + '/deposits/' + id, {headers: H});
    const j = await x.json();
    const tz = t => new Date(t).toLocaleDateString('en-US', {timeZone: 'America/Los_Angeles'});
    const days = {};
    for (const t of (j.associated_transactions || [])) { const k = tz(t.transaction_time); days[k] = (days[k] || 0) + 1; }
    return {rest: r, sid: j.short_distribution_id, created: j.created_date, total: j.total, totals: j.totals, days, ntx: (j.associated_transactions||[]).length};
  }));
  return JSON.stringify(res);
}

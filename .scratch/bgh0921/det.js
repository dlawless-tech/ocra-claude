async () => {
  const deps = [["2217880","AQAAAAAAIdeYAAABoI7WPIAAAAGghImEgAEAAAGgf2MogA"],["2217880","AQAAAAAAIdeYAAABoLLiwIAAAAGgqJYIgAEAAAGgo2-sgA"],["2217880","AQAAAAAAIdeYAAABoNbvRIAAAAGgzKKMgAEAAAGgx3wwgA"],["2220039","AQAAAAAAIeAHAAABoI7WPIAAAAGghImEgAEAAAGgf2MogA"],["2220039","AQAAAAAAIeAHAAABoLLiwIAAAAGgqJYIgAEAAAGgo2-sgA"],["2220039","AQAAAAAAIeAHAAABoNbvRIAAAAGgzKKMgAEAAAGgx3wwgA"],["2221704","AQAAAAAAIeaIAAABoI7WPIAAAAGghImEgAEAAAGgf2MogA"],["2221704","AQAAAAAAIeaIAAABoLLiwIAAAAGgqJYIgAEAAAGgo2-sgA"],["2221704","AQAAAAAAIeaIAAABoNbvRIAAAAGgzKKMgAEAAAGgx3wwgA"],["2224512","AQAAAAAAIfGAAAABoI7WPIAAAAGghImEgAEAAAGgf2MogA"],["2224512","AQAAAAAAIfGAAAABoLLiwIAAAAGgqJYIgAEAAAGgo2-sgA"],["2224512","AQAAAAAAIfGAAAABoNbvRIAAAAGgzKKMgAEAAAGgx3wwgA"]];
  const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json', 'content-type': 'application/json'};
  const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';
  const res = await Promise.all(deps.map(async ([r, id]) => {
    const x = await fetch(base + r + '/deposits/' + id, {headers: H});
    const j = await x.json();
    const tz = t => new Date(t).toLocaleDateString('en-US', {timeZone: 'America/New_York'});
    const days = {};
    for (const t of (j.associated_transactions || [])) { const k = tz(t.transaction_time); days[k] = (days[k] || 0) + 1; }
    return {rest: r, sid: j.short_distribution_id, created: j.created_date, total: j.total, totals: j.totals, days, ntx: (j.associated_transactions||[]).length};
  }));
  return JSON.stringify(res);
}

// playwright-cli eval on an open Stripe payout page. Returns JSON: payout amount, arrival, and each transaction row.
() => {
  const t = document.querySelector('main').innerText;
  const cells = s => s.split(/\n\t\n|\n\n\n/).map(x => x.trim()).filter(Boolean);
  const num = s => Number(s.replace(/[^0-9.-]/g, ''));
  const amount = num(t.match(/Payouts\n\$([0-9,.]+)/)[1]);
  const arrival = (t.match(/Payout completed\n([A-Z][a-z]{2} \d+)/) || [])[1] || '';
  const body = t.split(/Description\s*\n\t\nDate\s*\n/)[1].split(/\nLogs\n/)[0];
  const c = cells(body), rows = [];
  for (let i = 0; i + 5 < c.length + 1; i += 6)
    rows.push({ type: c[i], gross: num(c[i+1]), fee: num(c[i+2]), net: num(c[i+3]), description: c[i+4], date: c[i+5] });
  return JSON.stringify({ payoutId: location.pathname.split('/').pop(), amount, arrival, rows });
}

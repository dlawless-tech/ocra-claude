// Turn a Stripe payout export into the Bank Deposit's adjustment lines.
// Usage: node plan-lines.js <export.csv> <deposit date M/D/YYYY> <bank amount>
// Prints JSON {lines, total}; exits 1 with STOP: on anything it cannot place.
const fs = require('fs');
const [csvPath, depDate, bankAmt] = process.argv.slice(2);
const stop = m => { console.log('STOP: ' + m); process.exit(1); };

const parse = text => {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i+1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i+1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
};
const [head, ...body] = parse(fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, ''));
const col = n => { const i = head.indexOf(n); if (i < 0) stop('export has no ' + n + ' column'); return i; };
const T = col('Type'), D = col('Description'), A = col('Amount'), F = col('Fees');

const mdy = s => { const [m, d, y] = s.split('/').map(Number); return new Date(y, m - 1, d); };
const short = d => `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
const MON = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
const dep = mdy(depDate);
const cents = n => Math.round(n * 100);
// event on or before the deposit date clears the receivable; later is a deposit held
const byDate = ev => ev <= dep ? '1218' : '2440';
const trimName = s => s.replace(/[‘’]/g, "'").replace(/,?\s+(LLC|Inc\.?|L\.L\.C\.)\b/gi, '').replace(/\s+/g, ' ').trim();

const lines = []; let fees = 0, noShow = 0;
for (const r of body) {
  const type = r[T], desc = r[D].trim(), amt = Number(r[A]);
  fees += Number(r[F] || 0);
  // fee refund (positive) and separately billed processing fees (negative) both net into the fees
  if (type === 'Adjustment' && /^Application fee refund/i.test(desc)) { fees -= amt; continue; }
  if (type === 'Stripe Fee') { fees -= amt; continue; }
  // a refund carries its negative amount to the charge's own account and comment
  if (type !== 'Charge' && type !== 'Refund') stop(`${type} row "${desc}" ${amt}: place it by hand`);
  let m;
  if (/^OpenTable No-Show/i.test(desc)) { noShow += amt; continue; }
  if ((m = desc.match(/^OpenTable Experience:.*Reservation date \S+ (\d{4})-([A-Z][a-z]{2})-(\d{1,2})/))) {
    const ev = new Date(+m[1], MON[m[2]], +m[3]);
    lines.push({ account: byDate(ev), amount: amt, comment: `${short(ev)} OpenTable` }); continue;
  }
  if ((m = desc.match(/^Payment for (.+?) at dLe.a on (\d{1,2}\/\d{1,2}\/\d{4})/))) {
    const ev = mdy(m[2]);
    lines.push({ account: byDate(ev), amount: amt, comment: `${short(ev)} ${trimName(m[1])}` }); continue;
  }
  stop(`unrecognized charge "${desc}" ${amt}`);
}
if (noShow) lines.push({ account: '4915', amount: +noShow.toFixed(2), comment: 'OpenTable NoShows' });
if (fees) lines.push({ account: '8110', amount: -(+fees.toFixed(2)), comment: '' });
const total = lines.reduce((s, l) => s + cents(l.amount), 0) / 100;
if (bankAmt && cents(total) !== cents(Number(bankAmt))) stop(`lines total ${total.toFixed(2)}, bank ${bankAmt}`);
console.log(JSON.stringify({ depositDate: depDate, total, lines }, null, 1));

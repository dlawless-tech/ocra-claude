// Turn a Shuka (Resy) Stripe payout export into the Bank Deposit's adjustment lines.
// Usage: node plan-lines.js <export.csv> <deposit date M/D/YYYY> <bank amount>
// Prints JSON {depositDate, total, lines}; exits 1 with STOP: on anything it cannot place.
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
const T = col('Type'), D = col('Description'), A = col('Amount'), F = col('Fees'), N = col('Net');
const cents = n => Math.round(n * 100);
// "Name - 2026-10-22 20:45:00 - reservation" -> 10/22/26
const resDate = desc => { const m = desc.match(/ - (\d{4})-(\d{2})-(\d{2}) \d{2}:\d{2}:\d{2} - reservation\)?$/); return m && `${+m[2]}/${+m[3]}/${m[1].slice(2)}`; };
const label = (set, word) => [...set].sort((a, b) => new Date(a) - new Date(b)).join(', ') + ' ' + word;

let gross = 0, refunds = 0, fees = 0;
const chargeDates = new Set(), refundDates = new Set();
for (const r of body) {
  const type = r[T], desc = r[D].trim(), amt = Number(r[A]);
  if (type === 'Charge' || type === 'Refund') {
    const d = resDate(desc);
    if (!d) stop(`${type} row "${desc}" ${amt}: not a Resy reservation, place it by hand`);
    if (type === 'Charge') { gross += amt; fees += Number(r[F] || 0); chargeDates.add(d); }
    else { refunds += amt; fees += Number(r[F] || 0); refundDates.add(d); }
    continue;
  }
  // Radar and other Stripe fees are their own rows, with a fee of their own
  if (type === 'Stripe Fee') { fees -= Number(r[N]); continue; }
  stop(`${type} row "${desc}" ${amt}: place it by hand`);
}
const lines = [];
if (cents(gross)) lines.push({ account: '104-09', amount: +gross.toFixed(2), comment: label(chargeDates, 'reservations'), location: '400' });
if (cents(refunds)) lines.push({ account: '104-09', amount: +refunds.toFixed(2), comment: label(refundDates, 'refunds'), location: '400' });
if (cents(fees)) lines.push({ account: '632-00', amount: -(+fees.toFixed(2)), comment: 'fees', location: '400' });
const total = lines.reduce((s, l) => s + cents(l.amount), 0) / 100;
if (bankAmt && cents(total) !== cents(Number(bankAmt))) stop(`lines total ${total.toFixed(2)}, bank ${bankAmt}`);
console.log(JSON.stringify({ depositDate: depDate, total, lines }, null, 1));

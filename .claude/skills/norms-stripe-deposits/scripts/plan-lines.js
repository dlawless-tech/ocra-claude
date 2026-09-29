// Turn a NORMS Stripe payout export into the Bank Deposit's adjustment lines.
// Usage: node plan-lines.js <gc|inkind> <export.csv> <deposit date M/D/YYYY> <bank amount>
// Prints JSON {depositDate, total, lines}; exits 1 with STOP: on anything it cannot place.
const fs = require('fs');
const [stream, csvPath, depDate, bankAmt] = process.argv.slice(2);
const stop = m => { console.log('STOP: ' + m); process.exit(1); };
if (!['gc', 'inkind'].includes(stream)) stop(`stream ${stream}, want gc or inkind`);

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
const cents = n => Math.round(n * 100);

const lines = [];
if (stream === 'gc') {
  let gross = 0, fees = 0;
  for (const r of body) {
    const type = r[T], desc = r[D].trim(), amt = Number(r[A]);
    if (type === 'Charge') { gross += amt; fees += Number(r[F] || 0); continue; }
    // Radar and other Stripe fees come through as their own negative rows
    if (type === 'Stripe Fee') { fees -= amt; continue; }
    stop(`${type} row "${desc}" ${amt}: place it by hand`);
  }
  lines.push({ account: '2220', amount: +gross.toFixed(2), comment: '', location: '299' });
  if (cents(fees)) lines.push({ account: '6665', amount: -(+fees.toFixed(2)), comment: '', location: '299' });
} else {
  const byStore = {};
  for (const r of body) {
    const type = r[T], desc = r[D].trim(), amt = Number(r[A]);
    const m = desc.match(/^INKD Gratuity NORMS Restaurant \((\d{3})\)/);
    if (type !== 'Charge' || !m) stop(`${type} row "${desc}" ${amt}: place it by hand`);
    const s = byStore[m[1]] = byStore[m[1]] || { gross: 0, fees: 0 };
    s.gross += amt; s.fees += Number(r[F] || 0);
  }
  for (const store of Object.keys(byStore).sort()) {
    const s = byStore[store];
    lines.push({ account: '2223', amount: +s.gross.toFixed(2), comment: 'In Kind Tips', location: store });
    if (cents(s.fees)) lines.push({ account: '5510', amount: -(+s.fees.toFixed(2)), comment: 'In Kind Fees', location: store });
  }
}
const total = lines.reduce((s, l) => s + cents(l.amount), 0) / 100;
if (bankAmt && cents(total) !== cents(Number(bankAmt))) stop(`lines total ${total.toFixed(2)}, bank ${bankAmt}`);
console.log(JSON.stringify({ depositDate: depDate, total, lines }, null, 1));

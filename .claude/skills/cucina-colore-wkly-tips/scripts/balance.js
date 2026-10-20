// Read a 25100 GL Account Detail CSV for one Mon-Sun week and size the Tips entry.
// usage: node balance.js <gl.csv> <week end M/D/YYYY>
// Balances are credit-positive. Prints JSON; prints STOP: and exits 1 on a bad report.
const fs = require('fs');
const [file, we] = process.argv.slice(2);
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const split = l => { const o = []; let c = '', q = false; for (const ch of l) { if (ch === '"') { q = !q; continue } if (ch === ',' && !q) { o.push(c); c = ''; continue } c += ch } o.push(c); return o };
const n = x => +(x || '0').replace(/[,()]/g, '') * (/^\(/.test(x || '') ? -1 : 1);
const stop = m => { console.log('STOP: ' + m); process.exit(1) };
if (!/25100 - Employee Tips Payable/.test(lines[1] || '')) stop('report is not 25100 - Employee Tips Payable');
const hdr = split(lines[3]);
const col = k => hdr.indexOf(k);
const rows = lines.slice(4).filter(Boolean).map(split);
if (!rows.length) stop('no activity in the week');
const beg = n(rows[0][col('BegBalAmount')]);
let payroll = 0, tips = 0, other = 0, after = [];
for (const r of rows) {
  const amt = n(r[col('Credit')]) - n(r[col('Debit')]);
  const d = r[col('TrxDate')], num = r[col('TrxNumber')];
  const t = new Date(d) > new Date(we);
  if (t) after.push(d + ' ' + num);
  if (num === 'Tips' && d === we) tips += amt;
  else if (num === 'Payroll' && d === we) payroll += amt;
  else other += amt;
}
if (after.length) stop('lines dated after ' + we + ': ' + after.join(', '));
const r2 = x => Math.round(x * 100) / 100;
const balance = r2(beg + other + payroll);
console.log(JSON.stringify({ weekEnd: we, begBal: r2(beg), sales: r2(other), payroll: r2(payroll), tipsNow: r2(tips), balance,
  endBal: r2(balance + tips), side: balance >= 0 ? 'credit' : 'debit', amount: r2(Math.abs(balance)), hasPayroll: payroll !== 0 }));

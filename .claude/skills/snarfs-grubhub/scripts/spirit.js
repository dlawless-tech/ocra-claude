// Spirit has no Grubhub login: each entry part's fees are its sales D less the Grubhub deposit that paid it, or an estimate at the trailing rate until that deposit lands.
// usage: node spirit.js <gl.csv of 10125 through today> <from YYYY-MM-DD> <today YYYY-MM-DD> [<entry dates in R365, comma separated>]
// Prints one record per entry part since <from>: {date, window, D, fees, basis: actual|estimate|no deposit, rate, deposits}.
// Parts follow the month-end split. With entry dates given, a month-end part with no entry folds into the period's other part.
const fs = require('fs');
const [CSV, FROM, TODAY, HAVE] = process.argv.slice(2);
const have = HAVE ? new Set(HAVE.split(',')) : null;
const parse = l => { const o = []; let c = '', q = false; for (const ch of l) { if (ch == '"') { q = !q; continue } if (ch == ',' && !q) { o.push(c); c = ''; continue } c += ch } o.push(c); return o };
const n = s => parseFloat(String(s).replace(/,/g, '')) || 0;
const iso = d => { const [m, dd, y] = d.split('/'); return y + '-' + m.padStart(2, '0') + '-' + dd.padStart(2, '0') };
const day = (s, k) => new Date(Date.parse(s + 'T12:00:00Z') + k * 864e5).toISOString().slice(0, 10);
const r2 = x => Math.round(x * 100) / 100;
const rows = fs.readFileSync(CSV, 'utf8').split(/\r?\n/).slice(4).filter(Boolean).map(parse).filter(r => r.length > 13 && /Spirit/.test(r[0]) && /^\d+\/\d+\/\d{4}$/.test(r[5]));
const sales = {}, dep = [];
for (const r of rows) {
  const d = iso(r[5]);
  if (/^grub/i.test(r[7])) continue;
  if (r[6] === 'Journal Entry') sales[d] = r2((sales[d] || 0) + n(r[12]) - n(r[13]));
  else if (r[6] === 'Bank Deposit') dep.push({ d, amt: r2(n(r[13]) - n(r[12])), no: r[7] });
}
const sumD = (a, b) => { let D = 0; for (let x = a; x <= b; x = day(x, 1)) D += sales[x] || 0; return r2(D); };

// entry parts: the period, or its two sides of month end
let tue = FROM;
while (new Date(tue + 'T12:00:00Z').getUTCDay() !== 2) tue = day(tue, -1);
const parts = [];
for (; day(tue, 6) < TODAY; tue = day(tue, 7)) {
  const mon = day(tue, 6), sun = day(tue, 5);
  if (tue.slice(5, 7) === mon.slice(5, 7)) { parts.push({ date: sun, window: [tue, mon] }); continue; }
  let me = mon; while (me.slice(5, 7) === mon.slice(5, 7)) me = day(me, -1);
  const p1 = { date: me, window: [tue, me] }, p2 = { date: me === sun ? mon : sun, window: [day(me, 1), mon] };
  if (have && !have.has(p1.date)) { p2.window = [tue, mon]; parts.push(p2); }
  else if (have && !have.has(p2.date)) { p1.window = [tue, mon]; p1.date = sun; parts.push(p1); }
  else parts.push(p1, p2);
}
// expected deposit share of sales, for matching deposits to parts
const NET = 0.85;
for (const p of parts) { p.D = sumD(...p.window); p.paid = 0; p.deposits = []; }
// Grubhub pays a part 1 to 10 days after it ends; a deposit can carry two parts (month-end days ride with the week before)
for (const x of [...dep].sort((a, b) => a.d.localeCompare(b.d))) {
  const cand = parts.filter(p => !p.deposits.length && p.D > 0 && p.window[1] < x.d && p.window[1] >= day(x.d, -10));
  let best = null;
  for (let i = 0; i < cand.length; i++) for (let j = i; j < cand.length; j++) {
    const set = i === j ? [cand[i]] : [cand[i], cand[j]];
    const err = Math.abs(set.reduce((s, p) => s + p.D * NET, 0) - x.amt) + (set.length - 1) * 2;
    if (!best || err < best.err) best = { set, err };
  }
  if (!best) continue;
  const DT = best.set.reduce((s, p) => s + p.D, 0);
  for (const p of best.set) { p.paid = r2(p.paid + x.amt * p.D / DT); p.deposits.push(x.d + ' ' + x.no + ' ' + x.amt); }
}
const RATE_WEEKS = 8, done = [];
for (const p of parts) {
  const fri = day(p.window[1], 10);
  if (p.deposits.length) { p.fees = r2(p.D - p.paid); p.basis = 'actual'; done.push(p); continue; }
  const w = done.slice(-RATE_WEEKS), D = w.reduce((s, x) => s + x.D, 0);
  p.rate = +((D ? w.reduce((s, x) => s + x.fees, 0) / D : 1 - NET) * 100).toFixed(2);
  if (p.D === 0) { p.fees = 0; p.basis = 'no sales'; }
  else if (TODAY > fri) { p.fees = p.D; p.basis = 'no deposit'; }
  else { p.fees = r2(p.D * p.rate / 100); p.basis = 'estimate'; }
}
console.log(JSON.stringify(parts.filter(p => p.window[1] >= FROM).map(({ paid, ...p }) => p), null, 1));

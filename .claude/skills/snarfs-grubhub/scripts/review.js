// Compare past GrubHub entries per store to Grubhub's transactions for each entry's window.
// usage: node review.js <raw.json> <gl dir holding gl-10125.csv, gl-70450.csv, gl-42060.csv> <from YYYY-MM-DD> > review.json
// Per store and entry: A/R credit, fee total and discrepancy posted against what Grubhub's transactions give for the entry's window. Spirit is outside the Grubhub login.
const fs = require('fs'), { execFileSync } = require('child_process');
const SK = __dirname + '/', GL = process.argv[3] + '/', FROM = process.argv[4];
const parse = l => { const o = []; let c = '', q = false; for (const ch of l) { if (ch == '"') { q = !q; continue } if (ch == ',' && !q) { o.push(c); c = ''; continue } c += ch } o.push(c); return o };
const n = s => parseFloat(String(s).replace(/,/g, '')) || 0;
const iso = d => { const [m, dd, y] = d.split('/'); return y + '-' + m.padStart(2, '0') + '-' + dd.padStart(2, '0') };
const rows = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).slice(4).filter(Boolean).map(parse).filter(r => r.length > 13 && /^\d+\/\d+\/\d{4}$/.test(r[5]));
const r2 = x => Math.round(x * 100) / 100;
const store = loc => loc.replace(/^Snarf.s Sandwiches \d - /, '');
const sales = {}, posted = {};
for (const r of rows(GL + 'gl-10125.csv')) {
  const s = store(r[0]), d = iso(r[5]);
  if (/^grub/i.test(r[7])) { const k = s + '|' + d; (posted[k] = posted[k] || { lines: [] }).lines.push(['10125', n(r[12]) - n(r[13]), r[10]]); }
  else if (r[6] === 'Journal Entry') { sales[s] = sales[s] || {}; sales[s][d] = r2((sales[s][d] || 0) + n(r[12]) - n(r[13])); }
}
for (const f of ['gl-70450.csv', 'gl-42060.csv']) for (const r of rows(GL + f)) if (/^grub/i.test(r[7])) {
  const k = store(r[0]) + '|' + iso(r[5]); (posted[k] = posted[k] || { lines: [] }).lines.push([f.slice(3, 8), n(r[12]) - n(r[13]), r[10]]);
}
const day = (s, k) => new Date(Date.parse(s + 'T12:00:00Z') + k * 864e5).toISOString().slice(0, 10);
const dow = s => new Date(s + 'T12:00:00Z').getUTCDay();
const KIND = [[/ar balance|deposit|payout/, 'ar'], [/^commissions?$/, 'commissions'], [/delivery/, 'delivery commissions'], [/processing/, 'order processing fees'],
  [/reward/, 'rewards'], [/promo/, 'targeted promotions'], [/adjust/, 'account adjustments'], [/refund/, 'refunds'], [/discrepanc|difference/, 'discrepancy']];
const kind = (a, c) => a === '10125' ? 'ar' : ((KIND.find(([re]) => re.test(c.toLowerCase())) || [])[1] || (a === '70450' ? 'fees?' : '42060?'));
const figCache = {};
const fig = (a, b) => figCache[a + b] = figCache[a + b] || JSON.parse(execFileSync('node', [SK + 'figures.js', process.argv[2], a, b], { maxBuffer: 1e8 }).toString());
const out = [];
const keys = Object.keys(posted).filter(k => k.split('|')[1] >= FROM && !k.startsWith('Spirit')).sort((a, b) => a.split('|')[1].localeCompare(b.split('|')[1]) || a.localeCompare(b));
for (const k of keys) {
  const [s, d] = k.split('|');
  let a, b;
  if (dow(d) === 0) { a = day(d, -5); b = day(d, 1);
    // a month-end entry for this store inside the period takes the days through month end
    for (let x = a; x < d; x = day(x, 1)) if (posted[s + '|' + x] && day(x, 1).slice(8) === '01') a = day(x, 1);
    if (b.slice(5, 7) !== d.slice(5, 7) && day(b, -b.slice(8)) !== d && posted[s + '|' + day(b, -b.slice(8))]) b = day(b, -b.slice(8));
  } else { b = d; a = d; while (dow(a) !== 2) a = day(a, -1); }
  const g = fig(a, b).find(x => x.store === s) || { net: 0, gross: 0, cat: {}, odd: [] };
  let D = 0; for (let x = a; x <= b; x = day(x, 1)) D += (sales[s] || {})[x] || 0; D = r2(D);
  const P = {}; for (const [acct, v, c] of posted[k].lines) { const t = kind(acct, c); P[t] = r2((P[t] || 0) + v); }
  const expAr = r2(g.net - D);
  const fees = ['commissions', 'delivery commissions', 'order processing fees', 'rewards', 'targeted promotions', 'account adjustments'];
  const expFees = r2(fees.reduce((x, f) => x + (g.cat[f] || 0), 0)), postFees = r2(Object.entries(P).filter(([t]) => fees.includes(t) || t === 'fees?').reduce((x, [, v]) => x + v, 0));
  const exp42 = r2(-expAr - expFees), post42 = r2((P.refunds || 0) + (P.discrepancy || 0) + (P['42060?'] || 0));
  const catDiff = fees.concat('refunds').filter(f => Math.abs((P[f] || 0) - (g.cat[f] || 0)) > 0.004).map(f => f + ' ' + (P[f] || 0).toFixed(2) + ' vs ' + (g.cat[f] || 0).toFixed(2));
  out.push({ store: s, date: d, window: a + '..' + b, D, net: r2(g.net), arPosted: P.ar || 0, arExpected: expAr, arDiff: r2((P.ar || 0) - expAr), feesPosted: postFees, feesExpected: expFees, feeDiff: r2(postFees - expFees), refundPosted: P.refunds || 0, refundExpected: g.cat.refunds || 0, discPosted: P.discrepancy || 0, discExpected: r2(exp42 - (g.cat.refunds || 0)), catDiff, odd: g.odd });
}
console.log(JSON.stringify(out, null, 1));

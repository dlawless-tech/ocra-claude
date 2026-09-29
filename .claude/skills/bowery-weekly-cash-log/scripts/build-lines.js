#!/usr/bin/env node
// Turn the week's transcribed cash logs into one set of entry lines per store.
//
//   build-lines.js logs.json > lines.json
//
// Stops on a bad week, an unknown or doubled store, a payout without a GL, or payouts above tips.
// Warns on a payout dated outside the week, on payouts that miss the log's Cash Purchases total, and on a questioned payout.
const path = require('path');
const x = require(path.resolve(process.argv[2]));
const LOC = { "Cookshop": '200 - Cookshop', "Shuka": '400 - Shuka', "Rosie's": "500 - Rosie's", "Shukette": '600 - Shukette', "Vic's": "700 - Vic's" };
const TIPS = '210-00 - Tips Payable', UNDEP = '100-99 - Undeposited Funds';
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const c = v => Math.round(v * 100) / 100;
const md = s => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s || ''); return m && new Date(+m[3], m[1] - 1, +m[2]); };

const sun = md(x.weekEnding);
if (!sun || sun.getDay() !== 0) stop(`weekEnding "${x.weekEnding}" is not a Sunday in M/D/YYYY`);
const mon = new Date(sun); mon.setDate(sun.getDate() - 6);
const dot = d => [d.getMonth() + 1, d.getDate()].map(n => String(n).padStart(2, '0')).join('.') + '.' + String(d.getFullYear()).slice(2);
const range = dot(mon) + ' - ' + dot(sun);

const seen = new Set(), out = [];
for (const s of x.stores || []) {
  const loc = LOC[s.store];
  if (!loc) stop(`unknown store "${s.store}"`);
  if (seen.has(s.store)) stop(`${s.store} listed twice`);
  seen.add(s.store);
  if (s.weekEndingOnLog !== x.weekEnding) stop(`${s.store} log reads week ending ${s.weekEndingOnLog}`);
  const tips = c(s.totalCashTips);
  if (!(tips > 0)) stop(`${s.store} has no Total Cash Tips`);

  const warnings = [], byGl = new Map();
  for (const p of s.payouts || []) {
    if (!/^\d{3}-\d{2} - \S/.test(p.gl || '')) stop(`${s.store} payout ${p.amount} "${p.description}" has no GL`);
    if (!(p.amount > 0)) stop(`${s.store} payout "${p.description}" has amount ${p.amount}`);
    const d = md(p.date);
    if (!d || d < mon || d > sun) warnings.push(`payout ${c(p.amount).toFixed(2)} "${p.description}" dated ${p.date}, outside the week`);
    const g = byGl.get(p.gl) || { amount: 0, items: [] };
    g.amount = c(g.amount + p.amount);
    g.items.push(p);
    byGl.set(p.gl, g);
  }
  // several payouts on one line: each note carries its amount
  for (const g of byGl.values()) g.desc = g.items.map(p => [p.vendor, p.description].filter(Boolean).join(' - ')
    + (g.items.length > 1 ? ' ' + c(p.amount).toFixed(2) : '') + (p.question ? ' (Q: ' + p.question + ')' : ''));
  const paid = c([...byGl.values()].reduce((t, g) => t + g.amount, 0));
  if (paid > tips) stop(`${s.store} payouts ${paid.toFixed(2)} exceed tips ${tips.toFixed(2)}`);
  if (Math.abs(paid - Math.abs(s.cashPurchasesTotal || 0)) > 0.001)
    warnings.push(`payouts ${paid.toFixed(2)} vs Cash Purchases week total ${Math.abs(s.cashPurchasesTotal || 0).toFixed(2)}`);

  const lines = [{ side: 'credit', gl: TIPS, amount: tips, comment: range }];
  for (const [gl, g] of byGl) lines.push({ side: 'debit', gl, amount: g.amount, comment: g.desc.join('; ') });
  lines.push({ side: 'debit', gl: UNDEP, amount: c(tips - paid), comment: range });
  for (const [gl, g] of byGl) for (const d of g.desc) if (d.includes('(Q: ')) warnings.push(`questioned on ${gl}: ${d}`);
  out.push({ store: s.store, loc, file: s.file, amount: tips, lines: lines.filter(l => l.amount > 0), warnings });
}
const missing = Object.keys(LOC).filter(k => !seen.has(k));
if (missing.length) stop(`no log for ${missing.join(', ')}`);
process.stdout.write(JSON.stringify({ weekEnding: x.weekEnding, range, stores: out }, null, 2) + '\n');
for (const s of out) for (const w of s.warnings) console.error(`WARN ${s.store}: ${w}`);

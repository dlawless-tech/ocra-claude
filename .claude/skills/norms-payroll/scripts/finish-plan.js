#!/usr/bin/env node
// Apply the hand adjustments MAPPING.md describes to build-plan.js's output.
//
//   finish-plan.js <csv> <lines.json> <plan.json> --taxes <stat total taxes>
//     --voids "22363|Garcia, Rachel Michelle|234.64;22364|..." [--out plan-final.json] [--comments comments.json]
//
// Moves garnishments and total taxes onto the two blank-comment 1030 lines,
// posts the Stat Summary's Total Taxes and moves 6040 at 299 by the rounding,
// splits 1030 into direct deposits and one line per void, zeroes unused void
// lines. Stops unless the result balances.
const fs = require('fs');
const R = x => Math.round(x * 100) / 100;
const num = s => parseFloat(String(s || '0').replace(/,/g, '')) || 0;
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i < 0 ? null : args[i + 1]; };
const [csvPath, linesPath, planPath] = args;
const die = m => { console.error('STOP: ' + m); process.exit(1); };

const L = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(x => x.trim());
const hdr = L[0].split(',').map(s => s.trim());
const rows = L.slice(1).map(l => { const c = l.split(',').map(s => s.trim()); const o = {}; hdr.forEach((h, i) => o[h] = c[i]); return o; });
const sum = f => R(-rows.filter(f).reduce((a, o) => a + parseFloat(o.DEBIT), 0));
const csvTaxes = sum(o => /^21(2[02468]|3[02])$/.test(o.ACCT_NO));
const garn = sum(o => o.ACCT_NO === '2144');
const cash = sum(o => o.ACCT_NO === '1030');

const statTaxes = num(opt('taxes'));
if (!statTaxes) die('--taxes is required');
if (Math.abs(statTaxes - csvTaxes) > 1) die(`Stat Summary taxes ${statTaxes} vs csv ${csvTaxes}: more than rounding`);
const voids = (opt('voids') || '').split(';').filter(Boolean).map(v => { const [ck, name, amt] = v.split('|'); return { cm: `${ck.trim()} ${name.trim()}`, amt: num(amt) }; });
const voidSum = R(voids.reduce((a, v) => a + v.amt, 0));

const je = JSON.parse(fs.readFileSync(linesPath, 'utf8'));
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const at = (acct, loc, cm) => je.map((r, i) => i).filter(i => je[i][1].startsWith(acct + ' ') && je[i][6].startsWith(loc + ' ') && cm(je[i][5]));
const one = (xs, what) => { if (xs.length !== 1) die(`${xs.length} lines for ${what}`); return xs[0]; };
const set = (i, d, c) => { const x = plan.find(q => q[0] === i); if (x) { x[1] = d; x[2] = c; } else plan.push([i, d, c]); };
const cur = i => { const x = plan.find(q => q[0] === i); return x ? x[1] : num(je[i][3]); };

const garnCm = one(at('1030', '299', c => c === 'wage garnishments'), 'commented wage garnishments');
const blanks = at('1030', '299', c => c === '');
if (blanks.length !== 2) die(`${blanks.length} blank-comment 1030 lines, want 2`);
const dd = one(at('1030', '299', c => c === 'direct deposits (checking / savings)'), 'direct deposits');
const er299 = one(at('6040', '299', c => c === 'er taxes'), '6040 er taxes at 299');
const voidRows = at('1030', '299', c => /^\d{5} /.test(c));
if (voids.length > voidRows.length) die(`${voids.length} voids, only ${voidRows.length} void lines; add lines first`);

set(garnCm, 0, 0);
set(blanks[0], 0, garn);
set(blanks[1], 0, statTaxes);
set(er299, R(cur(er299) + statTaxes - csvTaxes), 0);
set(dd, 0, R(cash - voidSum));
const comments = {};
voidRows.forEach((i, k) => {
  if (k < voids.length) { set(i, 0, voids[k].amt); comments[i] = voids[k].cm; } else set(i, 0, 0);
});

const m = new Map(plan.map(q => [q[0], q]));
let d = 0, c = 0;
je.forEach((r, i) => { const q = m.get(i); d += q ? q[1] : num(r[3]); c += q ? q[2] : num(r[4]); });
d = R(d); c = R(c);
if (d !== c) die(`out of balance: debits ${d.toFixed(2)} credits ${c.toFixed(2)}`);
fs.writeFileSync(opt('out') || 'plan-final.json', JSON.stringify(plan));
fs.writeFileSync(opt('comments') || 'comments.json', JSON.stringify(comments));
console.error(`garnishments ${garn}  total taxes ${statTaxes} (csv ${csvTaxes}, 6040 moved ${R(statTaxes - csvTaxes)})`);
console.error(`direct deposits ${R(cash - voidSum)}  voids ${voids.length} = ${voidSum}  unused void lines zeroed ${Math.max(0, voidRows.length - voids.length)}`);
console.error(`balanced  debits ${d.toFixed(2)}  credits ${c.toFixed(2)}`);

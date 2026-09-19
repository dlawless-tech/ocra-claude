#!/usr/bin/env node
// Map an ADP PR&TAX csv onto the lines of an R365 payroll entry.
//
//   build-plan.js <csv> <lines.json> [--verify]
//
// lines.json is the entry's rendered rows from dump-lines.sh:
//   [["", "5212 - Store Labor (Hourly)", "...", "31,600.58", "0.00", "regular ...", "211 - Slauson", "", ""], ...]
//
// Prints the plan as [[rowIndex, debit, credit], ...] on stdout, and a report on
// stderr: totals, lines with no csv row behind them, and amounts with no line to
// sit on. --verify compares the csv against the amounts already in the entry
// instead, which is how the mapping is proved on the previous week.
const fs = require('fs');
const R = x => Math.round(x * 100) / 100;
const num = s => parseFloat(String(s || '0').replace(/,/g, '')) || 0;

function loadCsv(p) {
  const L = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(x => x.trim());
  const hdr = L[0].split(',').map(s => s.trim());
  return L.slice(1).map(l => {
    const c = l.split(',').map(s => s.trim());
    const o = {}; hdr.forEach((h, i) => o[h] = c[i]);
    return { acct: o.ACCT_NO, amt: parseFloat(o.DEBIT), loc: o.DEPT_ID, memo: o.MEMO };
  });
}

// see MAPPING.md
function mapRow(r) {
  const a = r.acct, m = (r.memo || '').toUpperCase();
  if (a === '5210') return /SIGN ON BONUS/.test(m)
    ? { acct: '6030', cm: 'sign on bonus', loc: r.loc }
    : { acct: '5212', cm: 'regular / overtime / meal penalty', loc: r.loc };
  if (a === '5212' || a === '6065') return { acct: r.loc === '370' ? '6025' : '5210', cm: 'salary', loc: r.loc };
  if (a === '5320') return { acct: '5320', cm: 'er taxes', loc: r.loc };
  if (a === '5300') return { acct: '5300', cm: 'med/den/vis/dom part/acc/crit ill/hosp ind/life/whole life', loc: r.loc };
  if (a === '6050') return { acct: '6050', cm: 'med/den/vis/dom part/acc/crit ill/hosp ind/life/whole life', loc: '299' };
  if (a === '6010') return { acct: '6010', cm: 'general manager bonus', loc: r.loc };
  if (a === '5546') return { acct: '5546', cm: 'cell phone', loc: r.loc };
  if (a === '5547' || a === '6390') return { acct: '5547', cm: '', loc: r.loc };
  if (a === '5230') return { acct: '5230', cm: 'QTRBA', loc: r.loc };
  if (a === '6060') return { acct: '6060', cm: 'severance', loc: r.loc };
  if (a === '2265') return { acct: '2265', cm: 'vacation', loc: '299' };
  if (a === '2267') return { acct: '2267', cm: 'pto', loc: '299' };
  if (a === '2270') return { acct: '2270', cm: 'sick', loc: '299' };
  if (a === '2264') return { acct: '2264', cm: 'fsa contributions', loc: '299' };
  if (a === '2144') return { acct: '1030', cm: 'wage garnishments', loc: '299' };
  if (a === '2142') return { acct: '2142', cm: '401k loan', loc: '299' };
  if (a === '2140') return { acct: '2140', cm: '401k / roth', loc: '299' };
  if (/^21(20|22|24|26|28|30|32)$/.test(a)) return { acct: '1030', cm: 'total taxes', loc: '299' };
  if (a === '1030') return { acct: '1030', cm: 'direct deposits (checking / savings)', loc: '299' };
  return { acct: 'UNMAPPED-' + a, cm: r.memo, loc: r.loc };
}

const [csvPath, linesPath] = process.argv.slice(2);
const verify = process.argv.includes('--verify');
const csv = loadCsv(csvPath);
const rows = JSON.parse(fs.readFileSync(linesPath, 'utf8'));

const csvNet = R(csv.reduce((a, r) => a + r.amt, 0));
if (csvNet !== 0) console.error('WARNING csv does not net to zero: ' + csvNet.toFixed(2));

const want = {};
for (const r of csv) { const t = mapRow(r); const k = t.loc + '||' + t.acct + '||' + t.cm; want[k] = R((want[k] || 0) + r.amt); }

const key = r => (r[6].match(/^(\d+)/) || [])[1] + '||' + r[1].split(' - ')[0] + '||' + r[5];
const used = new Set(), plan = [], zeroed = [], mismatched = [];
let debits = 0, credits = 0;

rows.forEach((r, i) => {
  const k = key(r), old = R(num(r[3]) - num(r[4]));
  const v = (k in want) ? (used.add(k), want[k]) : 0;
  if (v > 0) debits += v; else credits -= v;
  if (R(v) !== old) {
    if (verify) mismatched.push({ i, line: r[1] + ' | ' + r[6] + ' | ' + r[5], want: R(v), got: old });
    else { plan.push([i, v > 0 ? R(v) : 0, v < 0 ? R(-v) : 0]); if (v === 0) zeroed.push(r[1] + ' | ' + r[6] + ' | ' + r[5]); }
  }
});

const orphans = Object.keys(want).filter(k => !used.has(k) && want[k] !== 0)
  .map(k => { const [l, a, c] = k.split('||'); return { loc: l, acct: a, cm: c, amt: want[k] }; });

const say = s => console.error(s);
if (verify) {
  say('VERIFY  lines ' + rows.length + '  mismatched ' + mismatched.length);
  mismatched.forEach(m => say('  row ' + m.i + '  want ' + m.want.toFixed(2) + '  got ' + m.got.toFixed(2) + '  ' + m.line));
} else {
  say('PLAN  lines ' + rows.length + '  changing ' + plan.length + '  going to 0.00 ' + zeroed.length);
  zeroed.forEach(z => say('  zero: ' + z));
}
say('totals  debits ' + R(debits).toFixed(2) + '  credits ' + R(credits).toFixed(2) + '  diff ' + R(debits - credits).toFixed(2));
if (orphans.length) {
  say('NO LINE TO HOLD THESE, add one each:');
  orphans.forEach(o => say('  ' + o.loc + '  ' + o.acct + '  ' + o.amt.toFixed(2) + '  ' + o.cm));
}
if (!verify) process.stdout.write(JSON.stringify(plan));

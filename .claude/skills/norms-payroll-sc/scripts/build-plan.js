#!/usr/bin/env node
// Map an ADP WVJ PR&TAX file onto the lines of an R365 Payroll - Support Center entry.
//
//   build-plan.js <current.csv> <prior.csv|-> <lines.json> [--verify]
//
// The WVJ file is cumulative within its accounting period, so a second-file
// period posts current minus prior. Pass "-" as prior for a first-file period.
// lines.json is the entry's rendered rows from dump-lines.sh.
//
// Prints the plan as [[rowIndex, debit, credit], ...] on stdout, and a report on
// stderr. --verify compares against the amounts already in the entry instead,
// which is how the mapping is proved on the prior period.
const fs = require('fs');
const R = x => Math.round(x * 100) / 100;
const num = s => parseFloat(String(s || '0').replace(/,/g, '')) || 0;

function loadCsv(p) {
  if (p === '-') return [];
  const L = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(x => x.trim());
  const hdr = L[0].split(',').map(s => s.trim());
  return L.slice(1).map(l => {
    const c = l.split(',').map(s => s.trim());
    const o = {}; hdr.forEach((h, i) => o[h] = c[i]);
    return { acct: o.ACCT_NO, amt: parseFloat(o.DEBIT), dept: o.DEPT_ID, memo: o.MEMO };
  });
}

// Slot names, not comments: the entry's comment wording drifts between periods.
// See MAPPING.md.
function slot(r) {
  const a = r.acct, m = (r.memo || '').toUpperCase();
  if (a === '1040') return /NET AMOUNT/.test(m) ? 'returned' : 'deposit';
  if (/^21(20|22|24|26|28|30|32)$/.test(a)) return 'taxes';
  if (a === '2140') return '401k';
  if (a === '2142') return 'loan';
  if (a === '2264') return 'fsahsa';
  if (a === '2267') return 'pto';
  if (a === '5230') return 'qtrba';
  if (a === '6020') return 'salary';
  if (a === '6025') return 'hourly';
  if (a === '6040') return 'ertax';
  if (a === '6050') return /MED REIMB/.test(m) ? 'medreimb'
    : (/pre|dental|medical|vision/i.test(m) ? 'copaypre' : 'copaypost');
  if (a === '6110') return 'meals';
  if (a === '6150') return 'cell';
  if (a === '6390') return 'mileage';
  if (a === '9999') return 'suspense';
  return 'UNMAPPED-' + a;
}

// Which rendered line each slot sits on. Account first, comment only to tell
// apart the two lines that share an account.
const FIND = {
  deposit:  r => acct(r) === '1040' && /deposit/i.test(r[5]),
  taxes:    r => acct(r) === '1040' && /tax/i.test(r[5]),
  '401k':   r => acct(r) === '2140',
  loan:     r => acct(r) === '2142',
  fsahsa:   r => acct(r) === '2264',
  pto:      r => acct(r) === '2267' && /pto/i.test(r[5]),
  suspense: r => acct(r) === '2267' && !/pto/i.test(r[5]),
  qtrba:    r => acct(r) === '5230',
  salary:   r => acct(r) === '6020',
  hourly:   r => acct(r) === '6025',
  ertax:    r => acct(r) === '6040',
  medreimb: r => acct(r) === '6050' && /med reimb/i.test(r[5]),
  meals:    r => acct(r) === '6110',
  cell:     r => acct(r) === '6150',
  mileage:  r => acct(r) === '6390',
};
const acct = r => (r[1] || '').split(' - ')[0].trim();

const [curPath, priorPath, linesPath] = process.argv.slice(2);
const verify = process.argv.includes('--verify');
const cur = loadCsv(curPath), prior = loadCsv(priorPath);
const rows = JSON.parse(fs.readFileSync(linesPath, 'utf8'));

for (const [name, set] of [['current', cur], ['prior', prior]]) {
  if (!set.length) continue;
  const net = R(set.reduce((a, r) => a + r.amt, 0));
  if (net !== 0) console.error('WARNING ' + name + ' file does not net to zero: ' + net.toFixed(2));
}

// delta = current minus prior, the period's own run
const want = {};
for (const r of cur)   { const s = slot(r); want[s] = R((want[s] || 0) + r.amt); }
for (const r of prior) { const s = slot(r); want[s] = R((want[s] || 0) - r.amt); }

const plan = [], zeroed = [], mismatched = [], unplaced = [];
let debits = 0, credits = 0;
const taken = new Set();

for (const s of Object.keys(FIND)) {
  const i = rows.findIndex((r, j) => !taken.has(j) && FIND[s](r));
  const v = R(want[s] || 0);
  if (i < 0) { if (v !== 0) unplaced.push({ slot: s, amt: v }); continue; }
  taken.add(i);
  if (v > 0) debits += v; else credits -= v;
  const old = R(num(rows[i][3]) - num(rows[i][4]));
  if (v !== old) {
    if (verify) mismatched.push({ i, slot: s, line: rows[i][1] + ' | ' + rows[i][5], want: v, got: old });
    else { plan.push([i, v > 0 ? v : 0, v < 0 ? R(-v) : 0]); if (v === 0) zeroed.push(s + '  ' + rows[i][1]); }
  }
}

// Copay lines: one when the entry folds pre-tax and post-tax together, two when
// it splits them. Follow the lines the entry arrives with.
const copayRows = [];
rows.forEach((r, j) => { if (!taken.has(j) && acct(r) === '6050') copayRows.push(j); });
const pre = j => /pre|dental|medical|vision/i.test(rows[j][5]);
const copayPlan = copayRows.length > 1
  ? [{ j: copayRows.filter(pre)[0],  v: R(want.copaypre  || 0) },
     { j: copayRows.filter(j => !pre(j))[0], v: R(want.copaypost || 0) }]
  : [{ j: copayRows[0], v: R((want.copaypre || 0) + (want.copaypost || 0)) }];
for (const { j, v } of copayPlan) {
  if (j === undefined) { if (v !== 0) unplaced.push({ slot: 'copay', amt: v }); continue; }
  taken.add(j);
  if (v > 0) debits += v; else credits -= v;
  const old = R(num(rows[j][3]) - num(rows[j][4]));
  if (v === old) continue;
  if (verify) mismatched.push({ i: j, slot: 'copay', line: rows[j][1] + ' | ' + rows[j][5], want: v, got: old });
  else { plan.push([j, v > 0 ? v : 0, v < 0 ? R(-v) : 0]); if (v === 0) zeroed.push('copay  ' + rows[j][1]); }
}

// Returned checks: one 2229 line each, so they reconcile as a total rather than
// resolving to a slot. Periods through 8/2026 booked them to 1199.
let returned = 0;
rows.forEach((r, j) => { if (/^(2229|1199)$/.test(acct(r))) { taken.add(j); const v = R(num(r[3]) - num(r[4])); returned += v; if (v > 0) debits += v; else credits -= v; } });
const wantReturned = R(want.returned || 0);
if (R(returned) !== wantReturned) unplaced.push({ slot: 'returned (2229 lines)', amt: wantReturned, line: 'lines hold ' + R(returned).toFixed(2) });

// slots with amounts and no line, and lines the mapping never claimed
for (const s of Object.keys(want)) {
  if (!(s in FIND) && !/^(returned|copaypre|copaypost)$/.test(s) && R(want[s]) !== 0) unplaced.push({ slot: s, amt: R(want[s]) });
}
rows.forEach((r, j) => { if (!taken.has(j)) unplaced.push({ slot: 'UNCLAIMED LINE row ' + j, amt: R(num(r[3]) - num(r[4])), line: r[1] + ' | ' + r[5] }); });

const say = s => console.error(s);
if (verify) {
  say('VERIFY  lines ' + rows.length + '  mismatched ' + mismatched.length);
  mismatched.forEach(m => say('  row ' + m.i + '  ' + m.slot.padEnd(9) + '  want ' + m.want.toFixed(2).padStart(12) + '  got ' + m.got.toFixed(2).padStart(12) + '  ' + m.line));
} else {
  say('PLAN  lines ' + rows.length + '  changing ' + plan.length + '  going to 0.00 ' + zeroed.length);
  zeroed.forEach(z => say('  zero: ' + z));
}
say('totals  debits ' + R(debits).toFixed(2) + '  credits ' + R(credits).toFixed(2) + '  diff ' + R(debits - credits).toFixed(2));
if (unplaced.length) {
  say('NO LINE TO HOLD THESE:');
  unplaced.forEach(o => say('  ' + o.slot + '  ' + o.amt.toFixed(2) + (o.line ? '  ' + o.line : '')));
}
if (!verify) process.stdout.write(JSON.stringify(plan));

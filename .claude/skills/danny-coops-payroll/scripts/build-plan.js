#!/usr/bin/env node
// Build the Danny & Coop's payroll entry from the payroll exports, and map
// it onto an entry's dumped lines.
//
//   build-plan.js <payroll-journal.csv> [--entry je.json] [--out edits.json]
//   build-plan.js <account-summary.csv> <payroll-summary.csv> [--entry je.json] [--out edits.json]
//
// Without --entry: prints the plan. With --entry: compares the plan against
// the entry's lines (from dump-lines.sh) and writes [row, debit, credit, comment]
// for every row that differs, plus paper-check lines to delete and add.
// Stops on anything that fails a check.
const fs = require('fs');

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(n); return i < 0 ? null : args.splice(i, 2)[1]; };
const entryPath = flag('--entry');
const outPath = flag('--out');
const journal = args.length === 1;
const [acctPath, empPath] = journal ? [null, args[0]] : args;
if (!empPath) { console.error('usage: build-plan.js <payroll-journal.csv> | <account-summary.csv> <payroll-summary.csv> [--entry je.json] [--out edits.json]'); process.exit(2); }

const fail = m => { console.error('STOP: ' + m); process.exit(1); };
const c2 = n => Math.round(n * 100);
const fmt = cents => (cents / 100).toFixed(2);

function csv(text) {
  const rows = [];
  for (const line of text.replace(/^﻿/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const r = []; let f = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { f += '"'; i++; } else if (ch === '"') q = false; else f += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { r.push(f); f = ''; } else f += ch;
    }
    r.push(f); rows.push(r);
  }
  return rows;
}
const money = s => { s = (s || '').replace(/[$,\s]/g, ''); return !s || s === '-' ? 0 : c2(parseFloat(s)); };

// journal: per-employee rows only, so derive the account summary; direct deposit is the plug
function acctFromJournal(rows) {
  const h = rows[0], tot = rows[rows.length - 1], emps = rows.slice(1, -1);
  const at = n => { const i = h.indexOf(n); if (i < 0) fail(`payroll journal has no ${n} column`); return i; };
  const v = n => money(tot[at(n)]);
  const $ = c => '$' + fmt(c);
  const out = [['Category', 'Description', 'Debit', 'Credit']];
  let dr = 0;
  const earn = { Wages: 'Hourly (Regular) Amt', Overtime: 'Overtime Amt', 'Non-Hourly Wages': 'Non-Hourly Regular Amt', Salaries: 'Salaried Amt', Bonus: 'Bonus Amt', Tips: 'Paycheck Tips Amt' };
  // export drops an earnings column nobody earned that week
  const ve = n => h.includes(n) ? v(n) : 0;
  for (const [d, n] of Object.entries(earn)) { out.push(['Earnings', d, $(ve(n)), '-']); dr += ve(n); }
  out.push(['Reimbursements', 'Reimbursements', $(v('Reimbursements')), '-']);
  for (const n of h.filter(n => /Deduction$/.test(n))) out.push(['Deductions', n, $(v(n)), $(v(n))]);
  for (const n of h.filter(n => /\(ER\)$/.test(n))) { out.push(['Taxes', n, $(v(n)), '-']); dr += v(n); }
  const pm = at('Payment Method'), net = at('Net Pay');
  for (const r of emps) if (!['Manual', 'Direct Deposit'].includes(r[pm])) fail(`${r[1]} ${r[0]} has payment method ${r[pm]}`);
  let ck = 0;
  for (const r of emps.filter(r => r[pm] === 'Manual')) { out.push(['Paper Check', `${r[1]} ${r[0]}`, '', r[net]]); ck += money(r[net]); }
  const ins = v('New York Paid Family Leave Insurance (EE)') + v('New York SDI (EE)');
  out.push(['Direct Deposit', '', '', $(dr - ins - ck)]);
  const md = s => new Date(s + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  out.push(['Selected Payrolls', `${md(tot[at('Period Start')])} - ${md(tot[at('Period End')])} (Pay day: ${md(tot[at('Payday')])})`]);
  return out;
}

// account summary
const acct = journal ? acctFromJournal(csv(fs.readFileSync(empPath, 'utf8'))) : csv(fs.readFileSync(acctPath, 'utf8'));
const hdr = acct[0];
const col = n => { const i = hdr.indexOf(n); if (i < 0) fail(`account summary has no ${n} column`); return i; };
const [CAT, DESC, DR, CR] = ['Category', 'Description', 'Debit', 'Credit'].map(col);
const sum = (cat, descs) => acct.slice(1).filter(r => r[CAT] === cat && (!descs || descs.includes(r[DESC]))).reduce((t, r) => t + money(r[DR]), 0);

const sel = acct.find(r => r[0] === 'Selected Payrolls');
if (!sel) fail('account summary has no Selected Payrolls line');
const m = sel[1].match(/^(\w+ \d+, \d{4}) - (\w+ \d+, \d{4}) \(Pay day: (\w+ \d+, \d{4})\)/);
if (!m) fail('cannot read period from: ' + sel[1]);
const mdy = s => { const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`; };
const period = { start: mdy(m[1]), end: mdy(m[2]), payDay: mdy(m[3]) };
const fileDay = !journal && empPath.match(/(\d{4})-(\d{2})-(\d{2})\.csv$/i);
if (fileDay && `${+fileDay[2]}/${+fileDay[3]}/${fileDay[1]}` !== period.payDay) fail(`payroll summary is for pay day ${fileDay[0].slice(0, 10)}, account summary for ${period.payDay}`);

const known = {
  Earnings: ['Bonus', 'Non-Hourly Wages', 'Overtime', 'Tips', 'Wages', 'Salaries'],
  Reimbursements: ['Reimbursements'],
};
for (const r of acct.slice(1)) {
  if (known[r[CAT]] && !known[r[CAT]].includes(r[DESC]) && money(r[DR])) fail(`unmapped ${r[CAT]} line: ${r[DESC]} ${r[DR]}`);
}
const reimb = sum('Reimbursements');
if (reimb) fail(`reimbursements of ${fmt(reimb)} have no account in the entry; ask where they post`);

// deductions post both sides in the summary and net to zero
for (const r of acct.slice(1).filter(r => r[CAT] === 'Deductions')) {
  if (money(r[DR]) !== money(r[CR])) fail(`deduction ${r[DESC]} is not a wash: ${r[DR]} / ${r[CR]}`);
}

// employee summary, last row is the totals row
const emp = csv(fs.readFileSync(empPath, 'utf8'));
const eh = emp[0];
const tot = emp[emp.length - 1];
if (tot[0] || tot[1]) fail('payroll summary last row is not the totals row');
const et = n => { const i = eh.indexOf(n); if (i < 0) fail(`payroll summary has no ${n} column`); return money(tot[i]); };
// a dropped earnings column is 0; the gross tie still catches an unmapped one
const ee = n => eh.includes(n) ? et(n) : 0;
const eeInsurance = et('New York Paid Family Leave Insurance (EE)') + et('New York SDI (EE)');

const hourly = sum('Earnings', ['Wages', 'Overtime', 'Non-Hourly Wages']);
const salaries = sum('Earnings', ['Salaries']);
const bonus = sum('Earnings', ['Bonus']);
const tips = sum('Earnings', ['Tips']);
const taxes = sum('Taxes') - eeInsurance;

// cross-check the two files
const tie = (label, a, b) => { if (a !== b) fail(`${label}: account summary ${fmt(a)} vs payroll summary ${fmt(b)}`); };
tie('hourly', hourly, ee('Hourly (Regular) Amt') + ee('Overtime Amt') + ee('Non-Hourly Regular Amt'));
tie('salaries', salaries, ee('Salaried Amt'));
tie('bonus', bonus, ee('Bonus Amt'));
tie('tips', tips, ee('Paycheck Tips Amt'));
tie('gross', hourly + salaries + bonus + tips, et('Gross Total'));

const dd = acct.filter(r => r[CAT] === 'Direct Deposit').reduce((t, r) => t + money(r[CR]), 0);
const checks = acct.filter(r => r[CAT] === 'Paper Check').map(r => ({ name: r[DESC].trim(), amt: money(r[CR]) }));
const netOf = {};
for (const r of emp.slice(1, -1)) netOf[`${r[1]} ${r[0]}`.toLowerCase()] = money(r[eh.indexOf('Net Pay')]);
for (const k of checks) {
  const n = netOf[k.name.toLowerCase()];
  if (n === undefined) fail(`paper check ${k.name} names no employee in the payroll summary`);
  if (n !== k.amt) fail(`paper check ${k.name} ${fmt(k.amt)} differs from their net pay ${fmt(n)}`);
}

const lines = [
  { acct: '60050', debit: hourly, credit: 0, comment: 'wages, overtime, non-hourly wages' },
  { acct: '67100', debit: taxes, credit: 0, comment: 'total taxes - NY PD Fam Leave & SDI' },
  { acct: '25100', debit: tips, credit: 0, comment: 'tips' },
  { acct: '10001', debit: 0, credit: dd, comment: 'direct deposit' },
  { acct: '60100', debit: salaries, credit: 0, comment: 'salaries' },
  { acct: '67600', debit: bonus, credit: 0, comment: 'bonus' },
  { acct: '90760', debit: 0, credit: 0, comment: '' },
  ...checks.map(k => ({ acct: '10001', debit: 0, credit: k.amt, comment: k.name, check: true })),
];
const dr = lines.reduce((t, l) => t + l.debit, 0), cr = lines.reduce((t, l) => t + l.credit, 0);
if (dr !== cr) fail(`entry out of balance: debits ${fmt(dr)} credits ${fmt(cr)}`);

console.log(`period ${period.start} - ${period.end}, pay day ${period.payDay}; entry date ${period.end}`);
console.log(`EE PFL + SDI netted out of taxes: ${fmt(eeInsurance)}`);
for (const l of lines) console.log(`${l.acct}\t${fmt(l.debit)}\t${fmt(l.credit)}\t${l.comment}`);
console.log(`total ${fmt(dr)}`);
if (!entryPath) process.exit(0);

// map onto the entry: first 10001 row is direct deposit, every later 10001 row is a paper check
const rows = JSON.parse(fs.readFileSync(entryPath, 'utf8')).map((r, i) => ({
  i, acct: (r[1].match(/^(\d+)/) || [])[1], debit: money(r[3]), credit: money(r[4]), comment: r[5] || '',
}));
const ddRow = rows.find(r => r.acct === '10001');
const checkRows = rows.filter(r => r.acct === '10001' && r !== ddRow);
const used = new Set(checkRows.map(r => r.i));
const pairs = [];
for (const l of lines.filter(l => !l.check)) {
  const row = rows.find(r => r.acct === l.acct && !used.has(r.i));
  if (!row) fail(`entry has no ${l.acct} line`);
  used.add(row.i); pairs.push([row, l]);
}
// checks pair by name first, then onto any spare check row
const planChecks = lines.filter(l => l.check);
const free = [...checkRows];
const take = pred => { const k = free.findIndex(pred); return k < 0 ? null : free.splice(k, 1)[0]; };
const unpaired = [];
for (const l of planChecks) {
  const row = take(r => r.comment.toLowerCase() === l.comment.toLowerCase());
  row ? pairs.push([row, l]) : unpaired.push(l);
}
const adds = [];
for (const l of unpaired) { const row = take(() => true); row ? pairs.push([row, l]) : adds.push(l); }
const deletes = free.map(r => r.i);

const edits = [], diffs = [];
for (const [row, l] of pairs) {
  const commentDiff = l.comment && row.comment.toLowerCase() !== l.comment.toLowerCase();
  if (row.debit !== l.debit || row.credit !== l.credit || commentDiff) {
    diffs.push(`row ${row.i} ${l.acct}: entry ${fmt(row.debit)}/${fmt(row.credit)} "${row.comment}" -> plan ${fmt(l.debit)}/${fmt(l.credit)} "${l.comment}"`);
    edits.push([row.i, l.debit / 100, l.credit / 100, l.comment || row.comment]);
  }
}
for (const r of rows.filter(r => !used.has(r.i) && r.acct !== '10001' && (r.debit || r.credit))) fail(`row ${r.i} ${r.acct} carries ${fmt(r.debit || r.credit)} with no plan line`);
for (const i of deletes) diffs.push(`DELETE row ${i}: paper check "${rows[i].comment}" ${fmt(rows[i].credit)}`);
for (const a of adds) diffs.push(`ADD LINE: 10001 credit ${fmt(a.credit)} "${a.comment}"`);
console.log(diffs.length ? diffs.join('\n') : 'entry matches plan');
if (outPath) fs.writeFileSync(outPath, JSON.stringify({ edits, deletes, adds: adds.map(a => [a.credit / 100, a.comment]) }));

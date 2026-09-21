#!/usr/bin/env node
// Build the R365 payroll import file from the ADP General Ledger: every
// location in one CSV, each one's hourly and salary payroll combined into a
// single journal entry.
//
//   build-entries.js --hourly <gl-hourly.csv> --salary <gl-salary.csv> \
//                    --checks <dir> --date <M/D/YYYY> --out <dir>
//
// --checks splits each net payroll line into its live checks, one line per
// check number, and is how the entry is meant to post. --no-checks builds
// without them and has to be asked for.
//
// Refuses to emit anything that does not balance or whose live checks do not
// reconcile against the GL's net payroll.
const fs = require('fs'), path = require('path');

const arg = n => { const i = process.argv.indexOf('--' + n); return i < 0 ? null : process.argv[i + 1]; };
const HOURLY = arg('hourly'), SALARY = arg('salary'), CHECKS = arg('checks'),
      DATE = arg('date'), OUT = arg('out') || '.';
const NOCHECKS = process.argv.indexOf('--no-checks') >= 0;
if (!HOURLY || !DATE) { console.error('usage: build-entries.js --hourly <csv> [--salary <csv>] --checks <dir> --date <M/D/YYYY> --out <dir>'); process.exit(1); }
// silence here would post the period with its live checks buried in one line
if (!CHECKS && !NOCHECKS) { console.error('STOP: pass --checks <dir>, or --no-checks to build without the check breakout'); process.exit(1); }
if (CHECKS && !fs.existsSync(CHECKS)) { console.error('STOP: no such checks directory: ' + CHECKS); process.exit(1); }
if (CHECKS && !fs.readdirSync(CHECKS).some(f => /^\d{6}-(hourly|salary)\.txt$/.test(f))) {
  console.error('STOP: ' + CHECKS + ' holds no <client id>-<hourly|salary>.txt; run extract-checks.sh first'); process.exit(1);
}

// client id -> R365 location. A new Bowery entity has to be added here; an
// unmapped client id stops the run rather than posting to a guessed location.
const LOC = {
  '154921': { num: '400', name: 'Shuka' },
  '154922': { num: '700', name: 'Vics' },
  '155030': { num: '500', name: 'Rosies' },
  '155050': { num: '800', name: 'Bowery Group' },
  '155090': { num: '200', name: 'Cookshop' },
  '155093': { num: '600', name: 'Shukette' },
};

// ADP codes maintenance wages to 620-20; R365 carries that expense at 600-20.
const ACCOUNT_FIX = { '620-20': '600-20' };

// 145-00 Net Payroll - Transit belongs to Bowery Group Corp whichever entity
// the transit was withheld from. R365 moves it there on save anyway, so the
// line is written that way rather than left to be corrected.
const LINE_LOCATION = { '145-00': '800' };

const GARNISH = /GARNISH|CHILD SUPPORT|ASSESSMENT/i;

const csv = f => {
  const rows = [];
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('*TOTAL') || /^\s*,/.test(line)) continue;
    const cells = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
};

const money = s => Math.round(parseFloat(String(s).replace(/,/g, '')) * 100) || 0;   // cents
const fmt = c => (c / 100).toFixed(2);

// GL rows -> {clientId: [{account, debit, credit, name}]}
function readGL(file) {
  if (!file) return {};
  const rows = csv(file);
  const head = rows.shift();
  const ix = n => head.indexOf(n);
  const cId = ix('Client ID'), cAcct = ix('GL Account Number'), cDeb = ix('Debit Amount'),
        cCre = ix('Credit Amount'), cName = ix('GL Account Name');
  if ([cId, cAcct, cDeb, cCre, cName].some(i => i < 0)) throw new Error(file + ': unexpected header ' + head.join('|'));
  const out = {};
  for (const r of rows) {
    const id = (r[cId] || '').trim();
    if (!/^\d{6}$/.test(id)) continue;
    const acct = (r[cAcct] || '').trim();
    if (!acct) throw new Error(file + ': row with no GL account number: ' + r.join('|'));
    (out[id] = out[id] || []).push({
      account: ACCOUNT_FIX[acct] || acct,
      debit: money(r[cDeb]), credit: money(r[cCre]),
      name: (r[cName] || '').trim(),
    });
  }
  return out;
}

// Net Pay Report -> [{num, amount}]. Each printed line carries up to two
// checks as "<date> [P] <check #> <amount>".
function readChecks(dir, id, kind) {
  const f = path.join(dir || '.', id + '-' + kind + '.txt');
  if (!fs.existsSync(f)) return { checks: [], stated: null };
  const txt = fs.readFileSync(f, 'utf8');
  const checks = [];
  for (const line of txt.split(/\r?\n/))
    for (const m of line.matchAll(/\b\d{2}\/\d{2}\/\d{4}\s+(?:P\s+)?(\d{4,7})\s+([\d,]+\.\d\d)/g))
      checks.push({ num: m[1], amount: money(m[2]) });
  const s = txt.match(/TOTAL TRANSACTIONS[^\n]*?(\d+)\s+TOTAL\s+([\d,]+\.\d\d)/);
  return { checks, stated: s ? { count: +s[1], amount: money(s[2]) } : null };
}

const glHourly = readGL(HOURLY), glSalary = readGL(SALARY);
const fail = [];
const plans = [];

for (const id of Object.keys(LOC)) {
  const loc = LOC[id];
  const hourly = glHourly[id] || [];
  const salary = glSalary[id] || [];
  if (!hourly.length && !salary.length) { fail.push(loc.name + ': no GL rows for client ' + id); continue; }

  const lines = [], checkLines = [];
  let tax = null;

  const block = (rows, kind) => {
    const r = readChecks(CHECKS, id, kind);
    const checks = r.checks, stated = r.stated;
    // the cash account is whatever the net payroll rows carry
    const net = rows.filter(x => x.name === 'NET PAYROLL' || x.name === 'PARTIAL DIRECT DEPOSITS');
    const cash = net.length ? net[0].account : null;
    if (net.some(x => x.account !== cash)) fail.push(loc.name + ' ' + kind + ': net payroll split across accounts');

    // an agency check (garnishment, tax levy) already has its own GL row and
    // sits outside net payroll, so it must not also become a check line
    const pool = rows.filter(x => x.account === cash && GARNISH.test(x.name)).map(x => x.credit);
    const mine = [], theirs = [];
    for (const c of checks) {
      const i = pool.indexOf(c.amount);
      if (i >= 0) { pool.splice(i, 1); theirs.push(c); } else mine.push(c);
    }

    if (stated) {
      const parsed = checks.reduce((a, b) => a + b.amount, 0);
      if (checks.length !== stated.count || parsed !== stated.amount)
        fail.push(loc.name + ' ' + kind + ': parsed ' + checks.length + ' checks / ' + fmt(parsed) +
                  ' against a stated ' + stated.count + ' / ' + fmt(stated.amount));
    }

    const netTotal = net.reduce((a, b) => a + b.credit - b.debit, 0);
    const checkTotal = mine.reduce((a, b) => a + b.amount, 0);
    const dd = netTotal - checkTotal;
    if (net.length && dd < 0)
      fail.push(loc.name + ' ' + kind + ': live checks ' + fmt(checkTotal) + ' exceed net payroll ' + fmt(netTotal));

    // Net payroll and partial direct deposits ride one line per pay run, since
    // a live check is drawn against the pair rather than against either one.
    let netIndex = -1;
    for (const x of rows) {
      if (net.indexOf(x) >= 0) { if (netIndex < 0) netIndex = lines.length; continue; }
      // one taxes line, held open at the position the hourly block gave it so
      // the salary run's share can be added without reordering anything
      if (x.name === 'NET PAYROLL TAXES') {
        if (!tax) { tax = { account: x.account, debit: 0, credit: 0, comment: 'NET PAYROLL TAXES' }; lines.push(tax); }
        tax.credit += x.credit - x.debit;
        continue;
      }
      lines.push({ account: x.account, debit: x.debit, credit: x.credit, comment: x.name });
    }
    if (net.length && dd > 0) lines.splice(netIndex, 0, { account: cash, debit: 0, credit: dd, comment: 'NET PAYROLL' });
    for (const c of mine) checkLines.push({ account: cash, debit: 0, credit: c.amount, comment: c.num });
    return { checks: mine.length, agency: theirs.length, dd: dd / 100, netTotal: netTotal / 100, checkTotal: checkTotal / 100 };
  };

  const h = block(hourly, 'hourly');
  const s = salary.length ? block(salary, 'salary') : null;


  // the report prints two checks per line, so reading order interleaves them
  checkLines.sort((a, b) => a.comment.localeCompare(b.comment, undefined, { numeric: true }));
  const all = lines.concat(checkLines);
  const D = all.reduce((a, b) => a + b.debit, 0), C = all.reduce((a, b) => a + b.credit, 0);
  if (D !== C) fail.push(loc.name + ': out of balance, debit ' + fmt(D) + ' credit ' + fmt(C));

  const glTotal = hourly.concat(salary).reduce((a, b) => a + b.debit, 0);
  if (D !== glTotal) fail.push(loc.name + ': entry total ' + fmt(D) + ' does not match the GL total ' + fmt(glTotal));

  plans.push({ id: id, loc: loc, lines: all, total: D, hourly: h, salary: s });
}

if (fail.length) { console.error('STOP:\n  ' + fail.join('\n  ')); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });

const HEAD = ['JENumber', 'Type', 'Date', 'ReversalDate', 'JEComment', 'JELocation',
              'Account', 'Debit', 'Credit', 'DetailLocation', 'DetailComment'];
const q = v => /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
const amt = c => c ? (c / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
const BLANK = HEAD.map(() => '').join(',');

// R365 groups lines into one entry by JENumber, Date and location, so every
// row carries JENumber. The blank separators are cosmetic; the 9/13 file left
// two location blocks with an empty JENumber and neither imported.
const out = [HEAD.join(',')];
for (const p of plans) {
  if (out.length > 1) out.push(BLANK, BLANK);
  for (const l of p.lines)
    out.push([ 'Payroll', 'Standard', DATE, '', '', p.loc.num, l.account,
               amt(l.debit), amt(l.credit), LINE_LOCATION[l.account] || p.loc.num, l.comment ].map(q).join(','));
  console.log(p.loc.num + ' ' + p.loc.name.padEnd(14) + String(p.lines.length).padStart(3) + ' lines  ' +
              fmt(p.total).padStart(12) + (CHECKS ? '  checks h' + p.hourly.checks + (p.salary ? '/s' + p.salary.checks : '') : ''));
}
const f = path.join(OUT, DATE.replace(/\//g, '.') + ' Bowery PAYROLL IMPORT FILE.csv');
fs.writeFileSync(f, out.join('\r\n') + '\r\n');

fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify(plans.map(p => ({
  location: p.loc.num, name: p.loc.name, total: p.total / 100,
  lines: p.lines.map(l => ({ account: l.account, debit: l.debit / 100, credit: l.credit / 100,
                             location: LINE_LOCATION[l.account] || p.loc.num, comment: l.comment })),
})), null, 2));
console.log('grand total ' + fmt(plans.reduce((a, b) => a + b.total, 0)) + '  -> ' + path.basename(f));

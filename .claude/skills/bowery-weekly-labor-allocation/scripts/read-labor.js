#!/usr/bin/env node
// Read a Bowery Group Labor Allocation workbook into labor.json.
//
//   read-labor.js <file.xlsx> > labor.json
//
// Exits nonzero when the workbook disagrees with itself or names a position with no account.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const src = process.argv[2];
if (!src) { console.error('usage: read-labor.js <file.xlsx>'); process.exit(1); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab-'));
execFileSync('unzip', ['-o', '-q', src, '-d', dir]);
const rd = f => fs.readFileSync(path.join(dir, f), 'utf8');
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const fail = m => { console.error('FAIL: ' + m); process.exit(1); };
const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
const near = (a, b) => Math.abs(a - b) < 0.005;

const strs = [];
if (fs.existsSync(path.join(dir, 'xl/sharedStrings.xml')))
  for (const m of rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let t = ''; for (const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += n[1];
    strs.push(unesc(t));
  }
const cell = {};
for (const cm of rd('xl/worksheets/sheet1.xml').matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g)) {
  const ty = (cm[2].match(/t="([^"]+)"/) || [])[1], v = ((cm[4] || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1];
  if (v !== undefined) cell[cm[1]] = ty === 's' ? strs[+v].trim() : ty === 'str' ? unesc(v).trim() : +v;
}
const find = (txt, col) => Object.keys(cell).filter(k => cell[k] === txt && (!col || k.startsWith(col))).map(k => +k.match(/\d+/)[0]);

if (cell.B4 !== 'Pay Week Ending' || typeof cell.D4 !== 'number') fail('D4 is not the Pay Week Ending date; layout moved');
const we = new Date(Date.UTC(1899, 11, 30) + cell.D4 * 864e5);
const weekEnding = `${we.getUTCMonth() + 1}/${we.getUTCDate()}/${we.getUTCFullYear()}`;
if (we.getUTCDay() !== 0) fail(`week ending ${weekEnding} is not a Sunday`);

// position -> wage account; code wins, label is the fallback (9/13 wrote labels, 9/20 codes)
const acct = { 250: '600-01', 251: '600-02' };
const stores = ['Cookshop', 'Shuka', "Rosie's", "Vic's", 'Shukette', 'Bowery Group'];
const store = s => stores.find(x => x.toLowerCase() === String(s).split('’').join("'").toLowerCase());
const code = s => {
  const c = +(String(s).match(/^(\d+)/) || [])[1] || (/FOH/i.test(s) ? 250 : /BOH|KITCHEN/i.test(s) ? 251 : 0);
  if (!acct[c]) fail(`position "${s}" has no wage account; ask which 600- account it posts to`);
  return c;
};

const hdr = find('Employee Name', 'C')[0];
if (!hdr) fail('no Employee Name header');
const moves = [];
let r = hdr + 1, stated;
const end = Math.min(...find('Debit').filter(n => n > hdr));
if (!isFinite(end)) fail('no Debit / Credit summary under the employee rows');
for (; r < end; r++) {
  const name = cell['C' + r], w = cell['D' + r];
  if (name === undefined) { if (typeof w === 'number') { stated = w; break; } continue; }
  if (typeof w !== 'number') fail(`row ${r}: ${name} has no wages`);
  const from = store(cell['F' + r]), to = store(cell['H' + r]);
  if (!from || !to) fail(`row ${r}: unknown location "${cell['F' + r]}" -> "${cell['H' + r]}"`);
  if (from === to) fail(`row ${r}: ${name} allocated to the store that paid`);
  if (r2(w) === 0) continue;
  moves.push({ name: name.replace(/\s+/g, ' '), amount: r2(w), from, to, creditAcct: acct[code(cell['E' + r])], debitAcct: acct[code(cell['G' + r])] });
}
// wage total cell is absent some weeks
const wages = r2(moves.reduce((s, m) => s + m.amount, 0));
if (stated !== undefined && !near(wages, stated)) fail(`employee rows sum to ${wages}, the total reads ${r2(stated)}`);

// net per store, and the tax block beside it
const taxHdr = find('Payroll Taxes Allocation', 'C')[0];
if (!taxHdr) fail('no Payroll Taxes Allocation block');
const tax = [];
for (const s of stores) {
  const net = moves.reduce((t, m) => t + (m.to === s ? m.amount : 0) - (m.from === s ? m.amount : 0), 0);
  const tr = find(s, 'E').find(n => n > taxHdr);
  if (!tr) fail(`no tax row for ${s}`);
  const dr = r2(cell['F' + tr] || 0), cr = r2(cell['G' + tr] || 0);
  if (!near(dr, net > 0 ? r2(net * 0.0765) : 0) || !near(cr, net < 0 ? r2(-net * 0.0765) : 0)) fail(`${s} tax ${dr}/${cr} is not 7.65% of its net ${r2(net)}`);
  if (dr || cr) tax.push({ store: s, debit: dr, credit: cr });
}
const tdr = r2(tax.reduce((t, x) => t + x.debit, 0)), tcr = r2(tax.reduce((t, x) => t + x.credit, 0));
if (!near(tdr, tcr)) fail(`rounded tax debits ${tdr} miss credits ${tcr}; ask which store takes the cent`);

const total = r2(wages + tcr);
// grand total cell (wages + tax credits) is absent some weeks; check it when present
const gt = Object.keys(cell).find(k => k.startsWith('G') && +k.slice(1) > taxHdr + stores.length + 2 && typeof cell[k] === 'number');
if (gt && !near(r2(cell[gt]), total)) fail(`${gt} reads ${r2(cell[gt])}, the entry total is ${total}`);
console.log(JSON.stringify({ weekEnding, wages, total, moves, tax }, null, 1));

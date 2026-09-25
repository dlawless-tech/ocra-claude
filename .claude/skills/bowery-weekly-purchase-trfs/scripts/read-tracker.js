#!/usr/bin/env node
// Read the Reallocations tab of GL_Reallocation_Tracker <M.D.YY>.xlsx into lines.json.
//
//   read-tracker.js <file.xlsx> > lines.json
//
// Week ending comes from the file name. Exits nonzero when the tab disagrees with itself.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const src = process.argv[2];
if (!src) { console.error('usage: read-tracker.js <file.xlsx>'); process.exit(1); }
const fail = m => { console.error('FAIL: ' + m); process.exit(1); };
const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
const mdy = d => `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;

const fm = path.basename(src).match(/(\d{1,2})\.(\d{1,2})\.(\d{2})\.xlsx$/i);
if (!fm) fail('file name carries no M.D.YY week ending');
const we = new Date(Date.UTC(2000 + +fm[3], fm[1] - 1, +fm[2]));
if (we.getUTCDay() !== 0) fail(`week ending ${mdy(we)} is not a Sunday`);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ptr-'));
execFileSync('unzip', ['-o', '-q', src, '-d', dir]);
const rd = f => fs.readFileSync(path.join(dir, f), 'utf8');
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const strs = [];
if (fs.existsSync(path.join(dir, 'xl/sharedStrings.xml')))
  for (const m of rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let t = ''; for (const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += n[1];
    strs.push(unesc(t));
  }
const rels = rd('xl/_rels/workbook.xml.rels');
const tab = name => {
  const rid = (rd('xl/workbook.xml').match(new RegExp(`<sheet name="${name}"[^>]*r:id="([^"]+)"`)) || [])[1];
  if (!rid) fail(`no "${name}" tab`);
  const t = rels.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${rid}"`));
  const cell = {};
  for (const cm of rd('xl/' + (t[1] || t[2]).replace(/^\/?xl\//, '')).matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g)) {
    const ty = (cm[2].match(/t="([^"]+)"/) || [])[1], v = ((cm[4] || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1];
    if (v !== undefined) cell[cm[1]] = ty === 's' ? strs[+v] : ty === 'str' ? unesc(v) : +v;
  }
  return cell;
};
const at = (cell, k) => { const v = cell[k]; return typeof v === 'string' ? v.trim() : v; };

const gls = Object.values(tab('GL Expense Accounts')).filter(v => typeof v === 'string' && /^\d{3}-\d{2} - /.test(v)).map(v => v.trim());
const ra = tab('Reallocations');
const hdr = ['Date', 'From Location', 'To Location', 'Description / Reason', 'Amount', 'From GL', 'To GL'];
hdr.forEach((h, i) => { if (at(ra, 'ABCDEFG'[i] + '4') !== h) fail(`${'ABCDEFG'[i]}4 is not "${h}"; layout moved`); });

const locs = { Cookshop: '200 - Cookshop', Shuka: '400 - Shuka', "Rosie's": "500 - Rosie's", Shukette: '600 - Shukette', "Vic's": "700 - Vic's", Bowery: '800 - Bowery Group Corp' };
const loc = s => { const t = String(s).split('’').join("'").replace(/^rosies$/i, "Rosie's").replace(/^vics$/i, "Vic's"); return locs[Object.keys(locs).find(k => k.toLowerCase() === t.toLowerCase())]; };

const rows = [];
let stated;
for (let r = 5; r < 200; r++) {
  if (at(ra, 'D' + r) === 'Total logged:') { stated = at(ra, 'E' + r); break; }
  const v = 'ABCDEFG'.split('').map(c => at(ra, c + r));
  if (v.every(x => x === undefined || x === '')) continue;
  const [date, from, to, desc, amt, fromGl, toGl] = v;
  if (typeof date !== 'number') fail(`row ${r}: date "${date}"`);
  const d = new Date(Date.UTC(1899, 11, 30) + date * 864e5), age = (we - d) / 864e5;
  if (age < 0 || age > 6) fail(`row ${r}: date ${mdy(d)} falls outside the week ending ${mdy(we)}`);
  if (!loc(from) || !loc(to)) fail(`row ${r}: unknown location "${from}" -> "${to}"`);
  if (!gls.includes(fromGl) || !gls.includes(toGl)) fail(`row ${r}: GL "${fromGl}" -> "${toGl}" not on the GL Expense Accounts tab`);
  if (loc(from) === loc(to) && fromGl === toGl) fail(`row ${r}: moves ${fromGl} at ${from} onto itself`);
  if (typeof amt !== 'number' || r2(amt) <= 0) fail(`row ${r}: amount "${amt}"`);
  rows.push({ row: r, date: mdy(d), desc, amount: r2(amt), from: { gl: fromGl, loc: loc(from) }, to: { gl: toGl, loc: loc(to) } });
}
if (stated === undefined) fail('no "Total logged:" row');
const total = r2(rows.reduce((s, x) => s + x.amount, 0));
if (Math.abs(total - r2(stated)) > 0.001) fail(`rows sum to ${total}, Total logged reads ${r2(stated)}`);
if (!rows.length) fail(`no reallocations logged for the week ending ${mdy(we)}; no entry to post`);

// entry lines: credit the From GL, debit the To GL; rows sharing a line add up
const lines = {};
for (const x of rows) for (const [side, p] of [['credit', x.from], ['debit', x.to]]) {
  const k = [side, p.gl, p.loc].join('|');
  lines[k] = { side, gl: p.gl, loc: p.loc, amount: r2((lines[k] ? lines[k].amount : 0) + x.amount) };
}
console.log(JSON.stringify({ weekEnding: mdy(we), total, headerLocation: rows[0].from.loc, rows, lines: Object.values(lines) }, null, 1));

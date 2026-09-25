#!/usr/bin/env node
// Read the Cash Transfers to Make block of BWRY - Mgmt Fees & IC Transfers.xlsx into transfers.json.
//
//   read-transfers.js <file.xlsx> > transfers.json
//
// Finds the block by its labels, since the tab's name and columns move between weeks.
// Exits nonzero when the block disagrees with itself.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const src = process.argv[2];
if (!src) { console.error('usage: read-transfers.js <file.xlsx>'); process.exit(1); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ict-'));
execFileSync('unzip', ['-o', '-q', src, '-d', dir]);
const rd = f => fs.readFileSync(path.join(dir, f), 'utf8');
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const fail = m => { console.error('FAIL: ' + m); process.exit(1); };
const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;

const strs = [];
if (fs.existsSync(path.join(dir, 'xl/sharedStrings.xml')))
  for (const m of rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let t = ''; for (const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += n[1];
    strs.push(unesc(t));
  }
const rels = rd('xl/_rels/workbook.xml.rels');
const tab = prefix => {
  const rid = (rd('xl/workbook.xml').match(new RegExp(`<sheet name="${prefix}[^"]*"[^>]*r:id="([^"]+)"`)) || [])[1];
  if (!rid) fail(`no tab starting "${prefix}"`);
  const t = rels.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${rid}"`));
  const cell = {};
  for (const cm of rd('xl/' + (t[1] || t[2]).replace(/^\/?xl\//, '')).matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g)) {
    const ty = (cm[2].match(/t="([^"]+)"/) || [])[1], v = ((cm[4] || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1];
    if (v !== undefined) cell[cm[1]] = ty === 's' ? strs[+v] : ty === 'str' ? unesc(v) : +v;
  }
  return cell;
};
const at = (cell, c, r) => { const v = cell[c + r]; return typeof v === 'string' ? v.trim() : v; };

// week ending, from the fees tab
const fees = tab('Mgmt Fee Funding');
if (typeof fees.D5 !== 'number') fail('Mgmt Fee Funding D5 is not the Week Ending date');
const we = new Date(Date.UTC(1899, 11, 30) + fees.D5 * 864e5);
const mdy = d => `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
if (we.getUTCDay() !== 0) fail(`week ending ${mdy(we)} is not a Sunday`);

const ic = tab('Intercompany');
// balance sheet date sits one week before the week ending
const asOf = Object.values(ic).find(v => typeof v === 'string' && /^As of \d+\/\d+\/\d{4}$/.test(v.trim()));
if (!asOf) fail('no "As of" date on the Intercompany tab');
const [m, d, y] = asOf.trim().slice(6).split('/').map(Number);
if (Date.UTC(y, m - 1, d) + 7 * 864e5 !== we.getTime()) fail(`balance sheet ${asOf.trim()} is not the week before ${mdy(we)}`);

const hdr = Object.keys(ic).find(k => ic[k] === 'From');
if (!hdr) fail('no "From" header under Cash Transfers to Make');
const row0 = +hdr.match(/\d+/)[0];
const col = label => { const k = Object.keys(ic).find(k => +k.match(/\d+/)[0] === row0 && ic[k] === label); if (!k) fail(`no "${label}" header`); return k.match(/^[A-Z]+/)[0]; };
const cF = col('From'), cT = col('To'), cA = col('Amount');

const parties = ['Bowery', 'Cookshop', 'Shuka', "Rosie's", 'Shukette', "Vic's"];
const norm = s => { const t = String(s).split('’').join("'"); return parties.find(p => p.toLowerCase() === t.toLowerCase()) || (/^rosies$/i.test(t) ? "Rosie's" : /^vics$/i.test(t) ? "Vic's" : null); };
const transfers = [];
let stated;
for (let r = row0 + 1; r < row0 + 40; r++) {
  const f = at(ic, cF, r), t = at(ic, cT, r), a = at(ic, cA, r);
  if (f === undefined && t === undefined) { if (typeof a === 'number') { stated = a; break; } continue; }
  if (!norm(f) || !norm(t)) fail(`row ${r}: unknown party "${f}" -> "${t}"`);
  if (norm(f) === norm(t)) fail(`row ${r}: transfer from ${f} to itself`);
  if (typeof a !== 'number' || a < 0) fail(`row ${r}: amount "${a}"`);
  if (r2(a) === 0) continue;
  if (transfers.some(x => [x.from, x.to].sort().join() === [norm(f), norm(t)].sort().join())) fail(`row ${r}: second transfer between ${f} and ${t}`);
  transfers.push({ from: norm(f), to: norm(t), amount: r2(a) });
}
const total = r2(transfers.reduce((s, x) => s + x.amount, 0));
if (stated === undefined) fail('no total under the transfer rows');
if (Math.abs(total - r2(stated)) > 0.001) fail(`transfers sum to ${total}, the block states ${r2(stated)}`);
console.log(JSON.stringify({ weekEnding: mdy(we), total, transfers }, null, 1));

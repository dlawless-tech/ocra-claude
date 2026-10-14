#!/usr/bin/env node
// Read the Mgmt Fee Funding tab of BWRY - Mgmt Fees & IC Transfers.xlsx into fees.json.
//
//   read-sheet.js <file.xlsx> > fees.json
//
// Exits nonzero when the tab disagrees with itself.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const src = process.argv[2];
if (!src) { console.error('usage: read-sheet.js <file.xlsx>'); process.exit(1); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mgf-'));
execFileSync('unzip', ['-o', '-q', src, '-d', dir]);
const rd = f => fs.readFileSync(path.join(dir, f), 'utf8');
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const strs = [];
if (fs.existsSync(path.join(dir, 'xl/sharedStrings.xml')))
  for (const m of rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let t = ''; for (const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += n[1];
    strs.push(unesc(t));
  }

// tab by name, not position
const rid = (rd('xl/workbook.xml').match(/<sheet name="Mgmt Fee Funding"[^>]*r:id="([^"]+)"/) || [])[1];
if (!rid) { console.error('FAIL: no "Mgmt Fee Funding" tab'); process.exit(1); }
const target = rd('xl/_rels/workbook.xml.rels').match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${rid}"`));
const sh = rd('xl/' + (target[1] || target[2]).replace(/^\/?xl\//, ''));

const cell = {};
for (const cm of sh.matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g)) {
  const t = (cm[2].match(/t="([^"]+)"/) || [])[1], v = ((cm[4] || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1];
  if (v !== undefined) cell[cm[1]] = t === 's' ? strs[+v] : t === 'str' ? unesc(v) : +v;
}

const fail = m => { console.error('FAIL: ' + m); process.exit(1); };
const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
const near = (a, b, tol = 0.005) => Math.abs(a - b) <= tol;

if (cell.C5 !== 'Week Ending' || typeof cell.D5 !== 'number') fail('D5 is not the Week Ending date; layout moved');
const d = new Date(Date.UTC(1899, 11, 30) + cell.D5 * 864e5);
const weekEnding = `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
if (d.getUTCDay() !== 0) fail(`week ending ${weekEnding} is not a Sunday`);

// store block: C11:F15 down to the Total row
const stores = [];
for (let r = 11; cell['C' + r] !== 'Total' && r < 30; r++) {
  if (cell['C' + r] === undefined) continue;
  stores.push({ store: cell['C' + r], sales: cell['D' + r], pct: cell['E' + r], raw: cell['F' + r], fee: r2(cell['F' + r]) });
}
const tr = Object.keys(cell).find(k => /^C\d+$/.test(k) && cell[k] === 'Total' && +k.slice(1) < 20);
const total = cell['F' + tr.slice(1)];
if (stores.length !== 5) fail(`expected 5 stores, found ${stores.map(s => s.store).join(', ')}`);
if (!near(stores.reduce((a, s) => a + s.raw, 0), total, 0.01)) fail('store fees do not sum to the Total row');

// JE block under Debit/Credit mirrors the store block
for (const s of stores) {
  const r = Object.keys(cell).find(k => /^D(3[2-9]|4\d)$/.test(k) && cell[k] === s.store);
  if (!r || !near(cell['E' + r.slice(1)], s.raw)) fail(`JE block debit for ${s.store} disagrees with the store block`);
}

const sumFees = r2(stores.reduce((a, s) => a + s.fee, 0));
console.log(JSON.stringify({ weekEnding, feesToAllocate: r2(cell.D6), total: sumFees, entryAmount: r2(sumFees * 2), stores }, null, 1));

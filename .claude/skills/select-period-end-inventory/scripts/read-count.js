#!/usr/bin/env node
// Total the Select Industries period-end count from the "Ending Inventory with extension" workbook.
//   read-count.js "<Period N - Ending Inventory with extension.xlsx>" > count.json
// Column O (WX#EXA) is each lot's extended amount; column C names the storage location on a block's first row.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const r2 = x => Math.round(x * 100) / 100;

const src = process.argv[2];
if (!src || !fs.existsSync(src)) stop('no file ' + src);
const per = (path.basename(src).match(/Period\s*(\d+)/i) || [])[1];
if (!per) stop('file name carries no period: ' + path.basename(src));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sel-'));
execFileSync('unzip', ['-o', '-q', src, '-d', dir]);
const rd = f => fs.readFileSync(path.join(dir, f), 'utf8');
const strs = [];
if (fs.existsSync(path.join(dir, 'xl/sharedStrings.xml')))
  for (const m of rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let t = ''; for (const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += n[1];
    strs.push(t.replace(/&amp;/g, '&').trim());
  }
const sheets = fs.readdirSync(path.join(dir, 'xl/worksheets')).filter(f => f.endsWith('.xml'));
if (sheets.length !== 1) stop('expected one sheet, found ' + sheets.length);

const rows = [];
for (const r of rd('xl/worksheets/' + sheets[0]).matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  const c = {};
  for (const m of r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const v = ((m[3] || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1];
    if (v != null) c[m[1]] = /t="s"/.test(m[2]) ? strs[+v] : v;
  }
  rows.push({ n: +r[1], c });
}
if (rows[0].c.O !== 'WX#EXA' || rows[0].c.C !== 'WX#UNA') stop('header row is not the JDE open lots export (O=WX#EXA, C=WX#UNA)');

const byLoc = {}; let loc = null, lots = 0;
for (const { n, c } of rows.slice(1)) {
  if (c.A !== 'OPEN LOTS') stop('row ' + n + ' is not an OPEN LOTS row: ' + JSON.stringify(c));
  if (c.C) loc = c.C;
  if (!loc) stop('row ' + n + ' has no storage location above it');
  const x = Number(c.O);
  if (!isFinite(x)) stop('row ' + n + ' column O is not a number: ' + c.O);
  byLoc[loc] = (byLoc[loc] || 0) + x; lots++;
}
for (const k in byLoc) byLoc[k] = r2(byLoc[k]);
const total = r2(Object.values(byLoc).reduce((a, b) => a + b, 0));
console.log(JSON.stringify({ period: +per, lots, byLocation: byLoc, total }, null, 1));

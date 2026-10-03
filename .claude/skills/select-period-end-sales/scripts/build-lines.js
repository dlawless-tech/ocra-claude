#!/usr/bin/env node
// Turn one period tab of the Select Intercompany Sales workbook into the two entries' lines.
//
//   build-lines.js "<2026 Select Intercompany Sales.xlsm>" <period number> > lines.json
//
// CA reads column Z (CA Total), NV reads AA (NV 72-LV). Stops on anything that does not foot.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const c2 = x => Math.round(x * 100);

const [src, pn] = process.argv.slice(2);
if (!src || !fs.existsSync(src)) stop('no file ' + src);
if (!/^\d{1,2}$/.test(pn || '')) stop('period number missing');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-'));
execFileSync('unzip', ['-o', '-q', src, '-d', dir]);
const rd = f => fs.readFileSync(path.join(dir, f), 'utf8');
const strs = [];
for (const m of rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
  let t = ''; for (const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += n[1];
  strs.push(t.replace(/&amp;/g, '&'));
}
const book = rd('xl/workbook.xml'), rels = rd('xl/_rels/workbook.xml.rels');
const id = (book.match(new RegExp('<sheet name="P' + pn + '"[^>]*r:id="([^"]+)"')) || [])[1];
if (!id) stop('no tab P' + pn);
const rel = rels.match(new RegExp('<Relationship[^>]*Id="' + id + '"[^>]*>'))[0];
const c = {};
for (const m of rd('xl/' + rel.match(/Target="([^"]+)"/)[1].replace(/^\/?xl\//, '')).matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
  const t = (m[2].match(/t="([^"]+)"/) || [])[1], v = ((m[3] || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1];
  if (v !== undefined) c[m[1]] = t === 's' ? strs[+v] : v;
}

// A2: "P10  2026 (09/06/2026 - 10/03/2026)"
const hd = (c.A2 || '').match(/^P(\d+)\s+(\d{4})\s+\((\d\d)\/(\d\d)\/(\d{4})\s*-\s*(\d\d)\/(\d\d)\/(\d{4})\)/);
if (!hd || hd[1] !== String(+pn)) stop('A2 does not name period ' + pn + ': ' + c.A2);
const yy = hd[2].slice(2), end = (+hd[6]) + '/' + (+hd[7]) + '/' + hd[8];
if (new Date(+hd[8], hd[6] - 1, +hd[7]).getDay() !== 6) stop('period end ' + end + ' is not a Saturday');
if (c.Z6 !== 'CA Total' || !/^NV 72-LV/.test(c.AA6 || '')) stop('Z6/AA6 are not CA Total / NV 72-LV');

const entry = (col, number) => {
  const num = r => { const v = c[col + r]; if (v === undefined || isNaN(+v)) stop(col + r + ' is not a number'); return +v; };
  const nt = c2(num(11)), tx = c2(num(18)), all = c2(num(20)), net = c2(num(28));
  if (nt + tx !== all) stop(col + '11 + ' + col + '18 does not equal ' + col + '20');
  const tax = tx - net;  // tax takes the rounding so the entry foots to the recap
  return { number, date: end, total: all / 100, lines: [
    ['1140', all / 100, 0], ['4020', 0, nt / 100], ['4010', 0, net / 100], ['2115', 0, tax / 100]] };
};
const p = String(pn).padStart(2, '0');
console.log(JSON.stringify({ period: +pn, start: (+hd[3]) + '/' + (+hd[4]) + '/' + hd[5], end,
  ca: entry('Z', 'P' + p + "'" + yy + ' Sales'), nv: entry('AA', 'P' + p + "'" + yy + ' Sales (Nevada)') }, null, 1));

#!/usr/bin/env node
// Convert an ADP General Ledger xlsx export to csv.
//
//   xlsx-to-csv.js <file.xlsx> > out.csv
//
// Sheet1 only. Handles self-closing empty cells, which the ADP GL export
// writes for every blank debit or credit; a converter that skips them
// shifts whole rows left and swaps debits into credits.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const src = process.argv[2];
if (!src) { console.error('usage: xlsx-to-csv.js <file.xlsx>'); process.exit(1); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glx-'));
execFileSync('unzip', ['-o', '-q', src, '-d', dir]);

const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/&amp;/g, '&');

const strs = [];
const ss = path.join(dir, 'xl/sharedStrings.xml');
if (fs.existsSync(ss)) {
  for (const m of fs.readFileSync(ss, 'utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let t = ''; for (const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += n[1];
    strs.push(unesc(t));
  }
}

const col = r => { let n = 0; for (const c of r.match(/^[A-Z]+/)[0]) n = n * 26 + (c.charCodeAt(0) - 64); return n - 1; };
const sh = fs.readFileSync(path.join(dir, 'xl/worksheets/sheet1.xml'), 'utf8');
const out = [];
for (const rm of sh.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
  const cells = [];
  // both <c .../> and <c ...>...</c>
  for (const cm of rm[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = cm[2], body = cm[4] || '';
    const t = (attrs.match(/t="([^"]+)"/) || [])[1];
    const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
    cells[col(cm[1])] = t === 's' ? (strs[+v] ?? '')
      : t === 'inlineStr' ? unesc((body.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || '')
      : (v === undefined ? '' : unesc(v));
  }
  for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = '';
  out.push(cells.map(c => /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c).join(','));
}
fs.rmSync(dir, { recursive: true, force: true });
process.stdout.write(out.join('\n') + '\n');

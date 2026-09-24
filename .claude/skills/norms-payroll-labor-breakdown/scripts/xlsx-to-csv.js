#!/usr/bin/env node
// Convert an ADP xlsx export to csv.
//
//   xlsx-to-csv.js <file.xlsx> > out.csv
//
// Sheet1 only, shared strings resolved, no formatting.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const src = process.argv[2];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wvj-'));
execFileSync('unzip', ['-o', '-q', src, '-d', dir]);

const strs = [];
const ss = path.join(dir, 'xl/sharedStrings.xml');
if (fs.existsSync(ss)) {
  for (const m of fs.readFileSync(ss, 'utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let t = ''; for (const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += n[1];
    strs.push(t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
  }
}

const col = r => { let n = 0; for (const c of r.match(/^[A-Z]+/)[0]) n = n * 26 + (c.charCodeAt(0) - 64); return n - 1; };
const sh = fs.readFileSync(path.join(dir, 'xl/worksheets/sheet1.xml'), 'utf8');
const out = [];
for (const rm of sh.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
  const cells = [];
  for (const cm of rm[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*)>([\s\S]*?)<\/c>/g)) {
    const t = (cm[2].match(/t="([^"]+)"/) || [])[1];
    const v = (cm[3].match(/<v>([\s\S]*?)<\/v>/) || [])[1];
    cells[col(cm[1])] = t === 's' ? strs[+v]
      : t === 'inlineStr' ? ((cm[3].match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || '')
      : (v === undefined ? '' : v);
  }
  for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = '';
  out.push(cells.map(c => /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c).join(','));
}
fs.rmSync(dir, { recursive: true, force: true });
process.stdout.write(out.join('\n') + '\n');

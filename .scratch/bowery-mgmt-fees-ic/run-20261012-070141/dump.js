#!/usr/bin/env node
// Read the Cash Transfers to Make block of BWRY - Mgmt Fees & IC Transfers.xlsx into transfers.json.
//
//   read-transfers.js <file.xlsx> > transfers.json               Bowery entry, store-to-store listed under separate
//   read-transfers.js <file.xlsx> Shuka/Shukette > shuka.json    one store-to-store entry
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
const tab = name => {
  const rid = (rd('xl/workbook.xml').match(new RegExp(`<sheet name="[^"]*${name}[^"]*"[^>]*r:id="([^"]+)"`)) || [])[1];
  if (!rid) fail(`no tab named like "${name}"`);
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
const mdy = d => `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;

console.log(rd('xl/workbook.xml').match(/<sheet name="[^"]*"/g).join('\n'));
const ic = tab('Intercompany');
const key = k => { const m = k.match(/([A-Z]+)(\d+)/); return [+m[2], m[1]]; };
for (const k of Object.keys(ic).sort((a,b)=>{const [ra,ca]=key(a),[rb,cb]=key(b);return ra-rb||ca.localeCompare(cb);})) console.log(k, JSON.stringify(ic[k]));

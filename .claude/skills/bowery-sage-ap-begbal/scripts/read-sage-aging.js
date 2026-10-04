// Usage: node read-sage-aging.js <AP Aging.xlsx> <tab> > sage.json
// Excel refuses to open the Sage export, so read the sheet XML straight out of the zip.
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const [xlsx, tab] = process.argv.slice(2);
if (!xlsx || !tab) { console.error('usage: read-sage-aging.js <xlsx> <tab>'); process.exit(1); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sage-'));
execFileSync('unzip', ['-o', '-q', xlsx, '-d', dir]);
const rd = p => fs.readFileSync(path.join(dir, p), 'utf8');
const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const ss = [...rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('')));
const sheets = [...rd('xl/workbook.xml').matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map(m => ({ name: dec(m[1]), rid: m[2] }));
const rels = Object.fromEntries([...rd('xl/_rels/workbook.xml.rels').matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map(m => [m[1], m[2]]));
const sh = sheets.find(s => s.name.trim().toLowerCase() === tab.trim().toLowerCase());
if (!sh) { console.error('tab not found; tabs: ' + sheets.map(s => s.name).join(', ')); process.exit(1); }
const xml = rd('xl/' + rels[sh.rid].replace(/^\/?xl\//, ''));
const col = r => { let c = 0; for (const ch of r) c = c * 26 + ch.charCodeAt(0) - 64; return c - 1; };
const rows = [];
for (const r of xml.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)) {
  const cells = [];
  for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const t = (c[2].match(/t="(\w+)"/) || [])[1], v = ((c[3] || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1];
    cells[col(c[1])] = dec(t === 's' ? ss[+v] : (v ?? ((c[3] || '').match(/<t[^>]*>([\s\S]*?)<\/t>/) || [, ''])[1]));
  }
  rows.push(Array.from(cells, x => x ?? ''));
}
fs.rmSync(dir, { recursive: true, force: true });
// layout: A doc date serial, E type, F doc number, P due date, AL total, AO hold flag; vendor rows carry "Vendor No.:" in A, name in Y
const xd = n => { const d = new Date(Date.UTC(1899, 11, 30) + n * 864e5); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`; };
let vendor = '';
const items = [];
for (const c of rows) {
  if (c[0] === 'Vendor No.:') { vendor = (c[24] || c.filter(Boolean).pop()).trim(); continue; }
  if (/^\d{5}$/.test(c[0]) && c[4]) {
    const amt = Math.round((+c[37] || 0) * 100) / 100;
    items.push({ vendor, date: xd(+c[0]), serial: +c[0], due: c[15] ? xd(+c[15]) : "", hold: c[40] === "H", type: c[4].trim(), doc: c[5].replace(/\s+/g, ' ').trim(), amount: amt });
  }
}
console.log(JSON.stringify(items, null, 1));
const sum = items.reduce((a, i) => a + i.amount, 0);
console.error(`${items.length} items, ${new Set(items.map(i => i.vendor)).size} vendors, total ${sum.toFixed(2)}`);

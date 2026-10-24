// Compare the rows of two tabs (same or different dumps): open deposits, open receivables, rows cleared during the week.
// usage: node diff-tabs.js <dumpA> <tabA> <dumpB> <tabB>
// prints each row only one side has, and SAME when the tabs carry the same rows.
const fs = require('fs');
const [dA, tA, dB, tB] = process.argv.slice(2);
function rows(dumpF, tab) {
  const dump = fs.readFileSync(dumpF, 'utf8').split('\n');
  const s = dump.findIndex(l => l === '===== ' + tab); if (s < 0) throw 'no tab ' + tab;
  const c = {};
  for (let i = s + 1; i < dump.length && !dump[i].startsWith('====='); i++)
    for (const m of dump[i].matchAll(/([A-Z]+)(\d+)="((?:[^"\\]|\\.)*)"/g)) c[m[1] + m[2]] = JSON.parse('"' + m[3] + '"');
  const out = [], amt = v => (+v || 0).toFixed(2);
  for (let r = 5; r < 500 && c['C' + r] !== 'Total'; r++) {
    if ((c['C' + r] || '').trim()) out.push(c['E' + r] ? `dep cleared | ${c['C' + r].trim()} | ${amt(c['E' + r])}` : `dep | ${c['C' + r].trim()} | ${amt(c['D' + r])}`);
    if ((c['H' + r] || '').trim()) out.push((c['J' + r] || '').trim() ? `rec cleared | ${c['H' + r].trim()} | ${amt(c['J' + r])}` : `rec | ${c['H' + r].trim()} | ${amt(c['I' + r])}`);
  }
  return out;
}
const A = rows(dA, tA), B = rows(dB, tB).slice(), onlyA = [];
for (const x of A) { const i = B.indexOf(x); if (i >= 0) B.splice(i, 1); else onlyA.push(x); }
for (const x of onlyA) console.log(`only ${tA}: ${x}`);
for (const x of B) console.log(`only ${tB}: ${x}`);
if (!onlyA.length && !B.length) console.log('SAME');

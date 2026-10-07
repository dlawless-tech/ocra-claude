// List what a tab still carries that needs a look: deposits whose event date has passed, TBD or negative deposits, open receivables.
// usage: node open-items.js <dump.txt from xlsx-dump> <tab> <M/D/YYYY as-of>
const fs = require('fs');
const [dumpF, tab, asOf] = process.argv.slice(2);
const dump = fs.readFileSync(dumpF, 'utf8').split('\n');
const start = dump.findIndex(l => l === '===== ' + tab); if (start < 0) throw 'no tab ' + tab;
const c = {};
for (let i = start + 1; i < dump.length && !dump[i].startsWith('====='); i++)
  for (const m of dump[i].matchAll(/([A-Z]+)(\d+)="((?:[^"\\]|\\.)*)"/g)) c[m[1] + m[2]] = JSON.parse('"' + m[3] + '"');
const serial = s => /^\d{5}(\.\d+)?$/.test(s || '') ? +s : null;
const xl = v => { const s = serial(v); if (s === null) return v || ''; const d = new Date(Date.UTC(1899, 11, 30) + Math.round(s) * 864e5); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + String(d.getUTCFullYear()).slice(2); };
const cut = (new Date(asOf) - new Date(Date.UTC(1899, 11, 30))) / 864e5;
const rows = []; for (let r = 5; r < 500 && c['C' + r] !== 'Total'; r++) rows.push(r);
const out = (h, L) => { console.log('-- ' + h + ' (' + L.length + ')'); for (const l of L) console.log('   ' + l); };
out('deposits whose event has passed', rows.filter(r => c['C' + r] && c['D' + r] && serial(c['B' + r]) !== null && serial(c['B' + r]) <= cut).map(r => [xl(c['A' + r]), xl(c['B' + r]), c['C' + r], c['D' + r]].join(' | ')));
out('TBD or negative deposits', rows.filter(r => c['C' + r] && c['D' + r] && (serial(c['B' + r]) === null || +c['D' + r] < 0)).map(r => [xl(c['A' + r]), c['B' + r], c['C' + r], c['D' + r]].join(' | ')));
out('open receivables', rows.filter(r => c['H' + r] && c['I' + r]).map(r => [xl(c['G' + r]), c['H' + r], c['I' + r]].join(' | ')));

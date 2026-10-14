#!/usr/bin/env node
// Write one build-backup.js plan per store for a week.
// usage: node make-plans.js <week.raw> <readback.txt> <out dir>
// readback.txt: one "store|TransactionId|<read-entry.js result>" line per store
const fs = require('fs'), path = require('path');
const { readWeek, perStore } = require('../tx.js');
const [raw, rbFile, out] = process.argv.slice(2);
const w = readWeek(raw);
const byStore = Object.fromEntries(perStore(w, m => { console.error('STOP: ' + m); process.exit(1); }).map(a => [a.store, a]));
fs.mkdirSync(out, { recursive: true });
for (const line of fs.readFileSync(rbFile, 'utf8').split(/\r?\n/).filter(Boolean)) {
  const [store, id, ...rest] = line.split('|');
  let e = rest.join('|'); e = JSON.parse(e.startsWith('"') ? JSON.parse(e) : e);
  if (!byStore[store]) { console.error(`STOP: unknown store ${store}`); process.exit(1); }
  const plan = { entryDate: e.date, store, location: e.loc, status: e.ribbon.includes('Unapprove') ? 'Approved' : 'Unapproved', start: w.start, end: w.end,
    lines: e.lines.map(l => l.slice(0, 4)), totals: byStore[store], id, attachments: e.att };
  fs.writeFileSync(path.join(out, id + '.json'), JSON.stringify(plan));
  console.log([store, id, byStore[store].tx.length + ' rows', 'attached now: ' + (e.att.join(', ') || 'none')].join(' | '));
}

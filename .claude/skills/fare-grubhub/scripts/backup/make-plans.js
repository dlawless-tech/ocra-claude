#!/usr/bin/env node
// Write one build-backup.js plan per store for a week.
// usage: node make-plans.js <week.raw> <readback.txt> <shots dir> <out dir>
// readback.txt: one "store|TransactionId|<read-entry.js result>" line per store
// a store's deposits are the ones its 1103 line comment names; a zero store takes <shots dir>/none-<store, no spaces>-<period start>.png and its -pick.png, from capture-none.sh
const fs = require('fs'), path = require('path');
const [raw, rbFile, shots, out] = process.argv.slice(2);
let s = fs.readFileSync(raw, 'utf8'); s = s.slice(s.indexOf('"{'), s.lastIndexOf('}"') + 2);
const w = JSON.parse(JSON.parse(s));
const byId = Object.fromEntries(w.deposits.map(d => [d.short_distribution_id, d]));
fs.mkdirSync(out, { recursive: true });
for (const line of fs.readFileSync(rbFile, 'utf8').split(/\r?\n/).filter(Boolean)) {
  const [store, id, ...rest] = line.split('|');
  let e = rest.join('|'); e = JSON.parse(e.startsWith('"') ? JSON.parse(e) : e);
  const clear = e.lines.find(l => l[0].startsWith('1103')) || [];
  const sids = ((clear[3] || '').match(/deposit (.*)$/) || [, ''])[1].split(' + ').filter(Boolean);
  const miss = sids.filter(x => !byId[x] || !fs.existsSync(path.join(shots, x + '.png')));
  if (miss.length) { console.error(`STOP: ${store} missing deposit or capture ${miss.join(', ')}`); process.exit(1); }
  const none = ['', '-pick'].map(x => path.join(shots, `none-${store.replace(/ /g, '')}-${w.start}${x}.png`));
  const plan = { entryDate: e.date, store, location: e.loc, status: e.ribbon.includes('Unapprove') ? 'Approved' : 'Unapproved', start: w.start, end: w.end,
    lines: e.lines.map(l => l.slice(0, 4)), deposits: sids.map(x => byId[x]), pngs: sids.map(x => path.join(shots, x + '.png')),
    noDepositPngs: sids.length ? [] : none.filter(f => fs.existsSync(f)), id, attachments: e.att };
  fs.writeFileSync(path.join(out, id + '.json'), JSON.stringify(plan));
  console.log([store, id, sids.join('+') || 'no deposit', 'attached now: ' + (e.att.join(', ') || 'none')].join(' | '));
}

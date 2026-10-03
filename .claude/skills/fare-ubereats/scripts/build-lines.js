#!/usr/bin/env node
// Turn the week's Uber Earnings breakdowns into one set of entry lines per store.
//
//   build-lines.js week.txt <weekEnding M/D/YYYY> > lines.json
//
// week.txt is read-week.sh's output. Stops on an unknown store, a page showing another store or range,
// or a row the entry does not model (see breakdown.js).
const fs = require('fs'), path = require('path');
const { c, parseWeek, mapStore } = require('./breakdown');
const [file, weekEnding] = process.argv.slice(2);
const LOC = require(path.join(__dirname, 'stores.json')), UUID = require(path.join(__dirname, 'uuids.json'));
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const [, start, end] = /^# (\S+) (\S+)/.exec(fs.readFileSync(file, 'utf8')) || stop('week.txt has no "# <start> <end>" line');
const day = d => String(+d.slice(8)), yr = end.slice(0, 4);

const stores = [];
for (const b of parseWeek(file)) {
  const loc = LOC[b.name];
  if (!loc) stop(`unknown store "${b.name}"`);
  if (b.uuid !== UUID[b.name] || b.pageStore !== b.name) stop(`${b.name}: page shows "${b.pageStore}" for ${b.uuid}`);
  // "Sep 21 – 27, 2026", "Aug 31 – Sep 6, 2026"
  const [from, to] = b.range.split(' – ');
  if (!to || from.split(' ').pop() !== day(start) || !to.endsWith(` ${day(end)}, ${yr}`) && to !== `${day(end)}, ${yr}`) stop(`${b.name}: page range "${b.range}", expected ${start} to ${end}`);
  const m = mapStore(b);
  if (m.stop) stop(`${b.name}: ${m.stop}`);
  const lines = m.lines.map(l => ({ side: l.amt > 0 ? 'debit' : 'credit', gl: l.gl, amount: Math.abs(l.amt), comment: l.comment }));
  const amount = c(lines.filter(l => l.side === 'debit').reduce((t, l) => t + l.amount, 0));
  const bw = m.lines.find(l => l.comment === 'backup withholding');
  stores.push({ store: b.name, loc, amount, gross: m.gross, payout: m.net, withholding: bw ? bw.amt : 0, zero: !m.gross && !lines.length, lines });
}
process.stdout.write(JSON.stringify({ weekEnding, start, end, stores }, null, 1));

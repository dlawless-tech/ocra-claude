#!/usr/bin/env node
// Turn one period's Grubhub order transactions into one set of entry lines per store.
//
//   build-lines.js week.raw <entry date M/D/YYYY> > lines.json
//
// Stops on an unknown transaction type, an unmodeled fee, or a row whose fields do not add to its net.
const fs = require('fs');
const [file, entryDate] = process.argv.slice(2);
const { readWeek, perStore, GL } = require('./tx.js');
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const w = readWeek(file);
const c = v => Math.round(v) / 100;
const md = v => +v.slice(5, 7) + '/' + +v.slice(8, 10);
const stores = [];
for (const a of perStore(w, stop)) {
  const lines = [];
  const add = (gl, amt, comment) => { if (amt > 0) lines.push({ side: 'debit', gl, amount: c(amt), comment }); else if (amt < 0) lines.push({ side: 'credit', gl, amount: c(-amt), comment }); };
  for (const r of GL.rows) add(r.gl, a[r.key], r.comment);
  const dr = GL.rows.reduce((x, r) => x + a[r.key], 0);
  // what Grubhub kept = orders booked to 1103 less the net it pays
  if (dr !== a.gross - a.net) stop(`${a.store}: lines ${dr} != orders ${a.gross} - net ${a.net}`);
  add(GL.clear, -dr, `orders ${md(w.start)} - ${md(w.end)}, Grubhub net ${c(a.net).toFixed(2)}`);
  stores.push({ store: a.store, loc: a.loc, amount: c(dr), orders: c(a.gross), net: c(a.net), count: a.tx.length, zero: !a.tx.length, lines });
}
process.stdout.write(JSON.stringify({ weekEnding: entryDate, start: w.start, end: w.end, stores }, null, 1));

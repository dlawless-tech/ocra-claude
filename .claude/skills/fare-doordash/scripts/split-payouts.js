#!/usr/bin/env node
// Write each store's rows of the report's payout summary to its own CSV, the file attached to its entry.
//
//   split-payouts.js <report dir> <out dir>
//
// Prints "<store>\t<file>" per store with a payout. Rows stay as DoorDash wrote them, header included.
const fs = require('fs'), path = require('path');
const [dir, out] = process.argv.slice(2);
const STORES = require('./stores.json');
const fn = fs.readdirSync(dir).find(f => f.startsWith('FINANCIAL_PAYOUT_SUMMARY'));
if (!fn) { console.error(`no payout summary in ${dir}`); process.exit(1); }
const [head, ...rows] = fs.readFileSync(path.join(dir, fn), 'utf8').split(/\r?\n/).filter(Boolean);
const cols = head.replace(/^﻿/, '').split(',');
const iId = cols.indexOf('Store ID'), iDate = cols.indexOf('Payout date');
fs.mkdirSync(out, { recursive: true });
for (const [id, [store]] of Object.entries(STORES)) {
  // Store ID and Payout date sit before any quoted field
  const mine = rows.filter(r => r.split(',')[iId] === id);
  if (!mine.length) continue;
  const f = path.join(out, `DoorDash payout ${mine[0].split(',')[iDate]} ${store}.csv`);
  fs.writeFileSync(f, [head, ...mine].join('\n') + '\n');
  console.log(`${store}\t${f}`);
}

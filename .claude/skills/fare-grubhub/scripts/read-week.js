#!/usr/bin/env node
// Emit the eval function that pulls every FARE Grubhub order transaction in one sales window, New York days, both inclusive.
//
//   read-week.js 2026-10-06 2026-10-12 > rw.js
//   playwright-cli -s=$S eval "$(cat rw.js)" > week.raw
//
// Payout (DISTRIBUTION) rows settle earlier periods and are dropped. No backslashes: Windows argv rewrites them.
const [start, end] = process.argv.slice(2);
const ids = Object.keys(require('./stores.json'));
const to = new Date(end + 'T12:00:00Z'); to.setUTCDate(to.getUTCDate() + 1);
process.stdout.write(`async () => {
const tok = sessionStorage.getItem('authToken'); if (!tok) return 'STOP: no authToken, log in first';
const H = {authorization: 'Bearer ' + tok, accept: 'application/json'};
const ac = new AbortController(); setTimeout(() => ac.abort(), 60000);
const r = await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/v1/${ids.join(',')}/transactions?timeZone=America/New_York&channelGroup=&startDate=${start}&endDate=${to.toISOString().slice(0, 10)}', {headers: H, signal: ac.signal});
if (!r.ok) return 'STOP: transactions ' + r.status;
const tx = (await r.json()).filter(t => t.transaction_type !== 'DISTRIBUTION');
return JSON.stringify({start: '${start}', end: '${end}', transactions: tx});
}`);

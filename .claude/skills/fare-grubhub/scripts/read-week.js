#!/usr/bin/env node
// Emit the eval function that pulls every FARE Grubhub deposit holding orders in one Tue-Mon period.
//
//   read-week.js 2026-09-01 2026-09-07 > rw.js
//   playwright-cli -s=$S eval "$(cat rw.js)" > week.raw
//
// Deposits are searched by paid date, from the period start to 14 days past its end. No backslashes: Windows argv rewrites them.
const [start, end] = process.argv.slice(2);
const ids = Object.keys(require('./stores.json'));
const to = new Date(end + 'T00:00:00Z'); to.setUTCDate(to.getUTCDate() + 14);
process.stdout.write(`async () => {
const tok = sessionStorage.getItem('authToken'); if (!tok) return 'STOP: no authToken, log in first';
const H = {authorization: 'Bearer ' + tok, accept: 'application/json'};
const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';
const get = async u => { const ac = new AbortController(); setTimeout(() => ac.abort(), 25000); return (await fetch(base + u, {headers: H, signal: ac.signal})).json(); };
const sum = await get('${ids.join(',')}/deposits/summary?startTime=${start}T00:00:00.000Z&endTime=${to.toISOString().slice(0, 10)}T23:59:59.000Z');
const out = [];
for (const [rid, deps] of Object.entries(sum)) for (const d of deps) out.push(await get(rid + '/deposits/' + d.restaurant_distribution_id));
return JSON.stringify({start: '${start}', end: '${end}', deposits: out});
}`);

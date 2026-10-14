// Build one week's entry plan from DoorDash's tiles and R365's DSS sales for the same Mon-Sun week.
// 74910 = commission & fees + amendments, 78000 = marketing, 22000 = DSS sales - DD sales, Cr 13562 = DSS sales - DD net.
// usage: node plan.js <out.json> <Sunday M/D/YYYY> <source entry id> <dssSales> <ddSales> <commission> <marketing> <amendments> <net>
// figures as positive amounts; amendments at DoorDash's sign (a charge is negative)
const fs = require('fs'); const [out, dt, src, dss, sales, comm, mkt, amend, net] = process.argv.slice(2);
const r = x => Math.round(x * 100) / 100;
const fee = r(+comm - +amend), tax = r(+dss - +sales), m = r(+mkt), ar = r(+dss - +net);
if (Math.abs(r(+sales - +comm - +mkt + +amend) - +net) > 0.005) { console.log('STOP: DoorDash tiles do not close to net'); process.exit(1); }
if (Math.abs(r(fee + tax + m) - ar) > 0.005) { console.log('STOP: lines do not balance'); process.exit(1); }
const A = { f: ['74910 - Door Dash Fees', '0856de01-89b0-4691-b1e4-92cd5749d1d2'], ar: ['13562 - Door Dash - Receivable', '043b20db-58e9-4647-90b6-3628211d5e77'], t: ['22000 - Sales Tax Payable', 'a3bdcb3b-18a3-45a0-8537-8d56a323338f'], m: ['78000 - Marketing Expenses', 'ac48f612-da82-e611-9401-0cc47a39187f'] };
const lines = [{ account: A.f, comment: 'Commission & Fees + Amendments', debit: fee, credit: 0 }, { account: A.ar, comment: 'AR Doordash', debit: 0, credit: ar }, { account: A.t, comment: 'Sales Tax', debit: tax, credit: 0 }];
if (m) lines.push({ account: A.m, comment: 'Marketing Fee', debit: m, credit: 0 });
const plans = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')).filter(p => p.key !== 'The Sink|' + dt) : [];
const [sm, sd, sy] = dt.split('/'); const mon = new Date(Date.UTC(+sy, sm - 1, sd - 6)); const p2 = n => String(n).padStart(2, '0');
const num = 'DoorDash ' + p2(mon.getUTCMonth() + 1) + '.' + p2(mon.getUTCDate()) + '-' + p2(+sm) + '.' + p2(+sd);
plans.push({ key: 'The Sink|' + dt, num, source: src, amount: ar, r365loc: '10200 - The Sink', locId: 'e3e6211c-ba1d-4483-b4d5-f820e699122e', lines });
fs.writeFileSync(out, JSON.stringify(plans, null, 1));
console.log(num, dt, 'fees', fee, 'tax', tax, 'mkt', m, 'AR', ar, (tax / +sales * 100).toFixed(1) + '% tax');

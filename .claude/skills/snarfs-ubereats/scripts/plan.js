// Plan each store's UberEats entry for one Sunday from the Uber pull and the 10135 GL.
// usage: node plan.js <uber.json> <gl.json> <Sunday M/D/YYYY>   -> JSON array on stdout
// D = 10135 sales debits over Uber's pay period. ar = D - net; mkt, fees, refund = Uber's sections shown positive;
// diff = D - Uber Sales (incl. tax), the plug. ar = mkt + fees + refund + diff.
const fs = require('fs'), path = require('path');
const [uberF, glF, sunS] = process.argv.slice(2);
const uber = JSON.parse(fs.readFileSync(path.resolve(uberF), 'utf8')), gl = JSON.parse(fs.readFileSync(path.resolve(glF), 'utf8'));
const r2 = x => Math.round(x * 100) / 100, day = 864e5;
const D = s => { const [m, d, y] = s.split('/'); return new Date(+y, m - 1, +d); };
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sun = D(sunS), sunIso = iso(sun);
const LOC = { MX: '1 - MX', SLU: '2 - SLU', Skinker: '3 - Skinker', Page: '4 - Page', Fenton: '5 - Fenton', Kirkwood: '6 - Kirkwood', Spirit: '7 - Spirit' };
const out = [];
for (const [store, loc] of Object.entries(LOC)) {
  const p = { store, location: "Snarf's Sandwiches " + loc, warnings: [] };
  const rows = gl.filter(x => x.loc.endsWith(loc));
  const u = uber.find(x => x.store === store && x.end === sunIso);
  if (!u) { p.fail = `no Uber pay period ending ${sunIso}`; out.push(p); continue; }
  if (u.error) { p.fail = `Uber ${u.error}`; out.push(p); continue; }
  Object.assign(p, { start: u.start, end: u.end, status: u.status, settlement: u.settlement, restaurant: u.restaurant, net: u.net, sales: u.salesIncl });
  if (u.status !== 'SETTLED') p.fail = `Uber pay period is ${u.status}, not settled`;
  const a = D(u.start.replace(/(\d+)-(\d+)-(\d+)/, '$2/$3/$1')), b = sun;
  const dss = rows.filter(x => x.type === 'Journal Entry' && x.num !== 'UberEats' && D(x.d) >= a && D(x.d) <= b);
  p.D = r2(dss.reduce((s, x) => s + x.dr - x.cr, 0));
  p.mkt = r2(-(u.top.Marketing || 0)); p.fees = r2(-(u.top.UberFees || 0)); p.refund = r2(-(u.top.Amendments || 0));
  p.diff = r2(p.D - u.salesIncl); p.ar = r2(p.D - u.net);
  const chk = r2(u.salesIncl + (u.top.Marketing || 0) + (u.top.UberFees || 0) + (u.top.Amendments || 0));
  if (Math.abs(chk - u.net) > 0.005) p.fail = `Uber sections add to ${chk}, payout ${u.net}`;
  if (u.salesIncl > 0 && Math.abs(p.diff) > Math.max(50, u.salesIncl * 0.10)) p.fail = `R365 sales ${p.D} vs Uber sales ${u.salesIncl}: off ${p.diff}, a sales day is likely missing or doubled`;
  else if (Math.abs(p.diff) > 50) p.warnings.push(`discrepancy ${p.diff} (R365 ${p.D} vs Uber ${u.salesIncl})`);
  // prior week: its Sunday balance should equal the deposit since booked
  const ps = new Date(+sun - 7 * day), prior = rows.filter(x => D(x.d) <= ps);
  const bal = prior.length ? prior[prior.length - 1].bal : (rows[0] ? rows[0].beg : 0);
  const dep = rows.filter(x => x.type === 'Bank Deposit' && D(x.d) > ps && D(x.d) <= new Date(+ps + 5 * day)).reduce((s, x) => s + x.cr - x.dr, 0);
  const pu = uber.find(x => x.store === store && x.end === iso(ps));
  p.prior = { sunday: iso(ps), balance: r2(bal), deposits: r2(dep), uberNet: pu ? pu.net : null };
  if (Math.abs(bal - dep) > 0.005) p.warnings.push(`prior Sunday ${iso(ps)} balance ${r2(bal)} vs deposits booked ${r2(dep)}${pu ? ', Uber paid ' + pu.net : ''}`);
  out.push(p);
}
console.log(JSON.stringify(out, null, 1));

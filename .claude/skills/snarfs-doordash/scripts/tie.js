// 10130 tie-out: each Sunday's GL balance against the DoorDash deposits booked to 10130 the next Monday to Friday.
// usage: node tie.js <pay.json> <gl.json> [store]
// Run the GL approved only (gl/gl-detail.sh default) through at least the Friday after the last Sunday.
// Also lists payouts with no matching 10130 deposit, which leave the account off by their net.
const fs = require('fs'); const [pf, gf, only] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(pf)), GA = JSON.parse(fs.readFileSync(gf));
const r2 = v => Math.round(v * 100) / 100;
const gd = s => { const [m, d, y] = s.split('/'); return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; };
const pd = s => { const [m, d, y] = s.split('/'); return new Date(Date.UTC(y, m - 1, d)); };
const add = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
for (const store of only ? [only] : ['MX', 'SLU', 'Skinker', 'Page', 'Fenton', 'Kirkwood', 'Spirit']) {
  const G = GA.filter(x => x.loc.endsWith(' - ' + store)); if (!G.length) continue;
  const first = gd(G[0].d), last = gd(G[G.length - 1].d), beg = G[0].beg;
  const deps = G.filter(x => x.type === 'Bank Deposit');
  console.log(`${store}\nSunday         GLbal  depMon-Fri     diff`);
  let s = first; while (new Date(s + 'T12:00:00Z').getUTCDay()) s = add(s, 1);
  for (; s <= last; s = add(s, 7)) {
    const bal = r2(beg + G.filter(x => gd(x.d) <= s).reduce((a, x) => a + x.dr - x.cr, 0));
    const fri = add(s, 5), dep = r2(deps.filter(x => gd(x.d) > s && gd(x.d) <= fri).reduce((a, x) => a + x.cr - x.dr, 0));
    console.log(s, bal.toFixed(2).padStart(9), dep.toFixed(2).padStart(9), r2(bal - dep).toFixed(2).padStart(8), fri > last ? '(deposits not all in yet)' : '');
  }
  // payouts paid inside the GL window, each matched to a 10130 deposit of the same net within 10 days
  const used = new Set();
  for (const p of P.filter(p => p.store === store && gd(p.date) >= first && gd(p.date) <= add(last, -10)).sort((a, b) => pd(a.date) - pd(b.date))) {
    const i = deps.findIndex((x, j) => !used.has(j) && Math.abs(x.cr - x.dr - p.net) < 0.005 && pd(x.d) >= pd(p.date) && pd(x.d) - pd(p.date) <= 10 * 864e5);
    if (i < 0) console.log(`  payout ${p.id} paid ${p.date} net ${p.net.toFixed(2)} has no 10130 deposit`); else used.add(i);
  }
}

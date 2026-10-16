// 10130 tie-out at each Sunday: GL balance against the net of payouts whose window has started, less deposits to date.
// usage: node tie.js <pay.json> <gl.json> [store]   prints Sunday, GL balance, undeposited net, error, change in error
// Pull payouts from before the GL's first day; a tied store reads 0.00 error every Sunday.
const fs = require('fs'); const [pf, gf, only] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(pf)), GA = JSON.parse(fs.readFileSync(gf));
const r2 = v => Math.round(v * 100) / 100;
const gd = s => { const [m, d, y] = s.split('/'); return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; };
const cd = t => new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
for (const store of only ? [only] : ['MX', 'SLU', 'Skinker', 'Page', 'Fenton', 'Kirkwood', 'Spirit']) {
  const G = GA.filter(x => x.loc.endsWith(' - ' + store)); if (!G.length) continue;
  const PS = P.filter(p => p.store === store);
  const first = gd(G[0].d), last = gd(G[G.length - 1].d), beg = G[0].beg;
  // payouts started before the GL window sit in the beginning balance
  const pre = PS.filter(p => cd(p.start) < first).reduce((a, p) => a + p.net, 0);
  let d = new Date(first + 'T12:00:00Z'); while (d.getUTCDay()) d.setUTCDate(d.getUTCDate() + 1);
  console.log(`${store}\nSunday         GLbal undep.net    error   change`); let prev = null;
  for (; d.toISOString().slice(0, 10) <= last; d.setUTCDate(d.getUTCDate() + 7)) {
    const s = d.toISOString().slice(0, 10); const rows = G.filter(x => gd(x.d) <= s);
    const bal = r2(beg + rows.reduce((a, x) => a + x.dr - x.cr, 0));
    const dep = rows.filter(x => x.type === 'Bank Deposit').reduce((a, x) => a + x.cr - x.dr, 0);
    const net = PS.filter(p => cd(p.start) <= s).reduce((a, p) => a + p.net, 0) - pre;
    const exp = r2(beg + net - dep), err = r2(bal - exp);
    console.log(s, bal.toFixed(2).padStart(9), exp.toFixed(2).padStart(9), err.toFixed(2).padStart(8), (prev === null ? 0 : r2(err - prev)).toFixed(2).padStart(8)); prev = err;
  }
}

// Write each week's summary from the per-store pulls: "UberEats <client> WE <end>.csv" and ".json" in <out>/WE <end>/.
// One row per store, a store with no pay period ending that week included as such.
// usage: node summarize.js <work dir> <client out dir> <client label>
const fs = require('fs'), path = require('path');
const [work, out, label] = process.argv.slice(2);
const stores = JSON.parse(fs.readFileSync(path.join(work, 'stores.json'), 'utf8'));
const pulls = stores.map(s => { const f = path.join(work, s.restaurant + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { store: s.name, restaurant: s.restaurant, periods: null }; });
const weeks = [...new Set(pulls.flatMap(p => (p.periods || []).map(x => x.end)))].sort();
const r2 = x => Math.round(x * 100) / 100;
const q = v => v == null ? '' : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
let bad = 0;
for (const we of weeks) {
  const rows = pulls.map(p => {
    const addr = (stores.find(s => s.restaurant === p.restaurant) || {}).address || '';
    if (!p.periods) return { store: p.store, address: addr, note: 'not pulled' };
    const x = p.periods.find(y => y.end === we);
    if (!x) return { store: p.store, address: addr, note: 'no pay period ending this week' };
    const check = r2(x.net - (x.earnings + x.marketing + x.uberFees + x.amendments));
    const note = [x.status !== 'SETTLED' && x.status, x.error, check && 'sections miss payout by ' + check].filter(Boolean).join('; ');
    if (note) bad++;
    return { store: p.store, address: addr, ...x, check, note };
  });
  const lineKeys = [...new Set(rows.flatMap(r => Object.keys(r.lines || {})))];
  const cols = ['store', 'address', 'start', 'end', 'status', 'deposit', 'transactionId', 'earnings', 'marketing', 'uberFees', 'amendments', 'net', 'check', 'note'];
  const csv = [cols.concat(lineKeys).map(q).join(',')].concat(rows.map(r => cols.map(c => q(r[c])).concat(lineKeys.map(k => q((r.lines || {})[k]))).join(',')));
  const dir = path.join(out, 'WE ' + we); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `UberEats ${label} WE ${we}.csv`), csv.join('\r\n') + '\r\n');
  fs.writeFileSync(path.join(dir, `UberEats ${label} WE ${we}.json`), JSON.stringify({ client: label, weekEnding: we, stores: rows }, null, 1));
  const tot = r2(rows.reduce((a, r) => a + (r.net || 0), 0));
  console.log(`WE ${we}: ${rows.filter(r => r.settlement).length}/${rows.length} stores, net ${tot}` + rows.filter(r => r.note).map(r => `\n  ${r.store}: ${r.note}`).join(''));
}
process.exit(bad ? 1 : 0);

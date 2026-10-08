// plan.json + each store's latest EZ Cater Fees entry -> entries.json, one entry per store.
// sources.txt: one "<location>|<TransactionId>" per line (sources.js). A store with none copies Claremont's.
// usage: node entries.js <plan.json> <sources.txt> <entry date M/D/YYYY>
const fs = require('fs'), path = require('path');
const plan = require(path.resolve(process.argv[2])); const DT = process.argv[4];
const src = Object.fromEntries(fs.readFileSync(process.argv[3], 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.split('|')));
const locs = require('./locations.json'); const ac = locs._accounts;
const side = v => v >= 0 ? [v, 0] : [0, -v];
const out = plan.map(p => {
  const loc = locs[p.loc]; if (!loc) throw new Error('no R365 location for ' + p.loc);
  const source = src[p.loc] || src.Claremont; if (!source) throw new Error('no source entry for ' + p.loc);
  const [ard, arc] = side(-p.ar), [dd, dc] = side(p.diff);
  const lines = [
    { account: ac.ar, comment: 'r365 ez cater debit balance - caterer total due', debit: ard, credit: arc },
    { account: ac.fees, comment: 'total - caterer total due', debit: p.fee, credit: 0 },
    { account: ac.difference, comment: '', debit: dd, credit: dc }];
  if (p.miss) lines.push({ account: ac.missing, comment: 'ez cater orders missing from r365 sales', debit: 0, credit: p.miss });
  const amount = +lines.reduce((t, l) => t + l.debit, 0).toFixed(2);
  return { key: p.loc + '|' + DT, loc: p.loc, r365loc: loc[0], locId: loc[1], source, amount, lines };
});
console.log(JSON.stringify(out, null, 1));

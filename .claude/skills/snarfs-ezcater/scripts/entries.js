// plan.json -> entries.json: one EZ Cater Fees entry per store and week, three lines.
// usage: node entries.js <plan.json> > entries.json
const path = require('path');
const plan = require(path.resolve(process.argv[2])).entries; const st = require('./stores.json'); const ac = st._accounts;
const side = v => v >= 0 ? [v, 0] : [0, -v];
const out = plan.map(p => {
  const loc = st[p.store]; if (!loc) throw new Error('no R365 location for ' + p.store);
  const [ard, arc] = side(-p.ar), [fd, fc] = side(p.fee), [dd, dc] = side(p.diff);
  const lines = [
    { account: ac.ar, comment: 'r365 ez cater sales - caterer total due', debit: ard, credit: arc },
    { account: ac.fees, comment: 'ez cater order total - caterer total due', debit: fd, credit: fc },
    { account: ac.difference, comment: 'r365 sales - ez cater order total', debit: dd, credit: dc }];
  const amount = +lines.reduce((t, l) => t + l.debit, 0).toFixed(2);
  return { key: p.store + '|' + p.date, store: p.store, date: p.date, r365loc: loc[0], locId: loc[1], source: st._source, amount, lines };
});
console.log(JSON.stringify(out, null, 1));

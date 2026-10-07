// Turn per-store, per-account fees into one 3rd Party entry: AR credits per store, then the store's 7161 debit.
// fees: [{ store: 'Flecha HB', acct: '1237', fee, comment }]. A negative fee flips both sides.
// offset: the account taking the other side, 7161 unless given.
const ids = require('./ids.js');
const r2 = n => Math.round(n * 100) / 100;
module.exports = (date, number, comment, fees, feeComment, offset = ids.fees) => {
  const lines = [], stores = [];
  for (const [store, s] of Object.entries(ids.stores)) {
    const mine = fees.filter(f => f.store === store && r2(f.fee) !== 0);
    if (!mine.length) continue;
    let net = 0;
    for (const f of mine) {
      const a = ids.accounts[f.acct], fee = r2(f.fee); net = r2(net + fee);
      lines.push({ gl: a.gl, glId: a.id, loc: s.loc, locId: s.id, side: fee > 0 ? 'credit' : 'debit', amount: Math.abs(fee), comment: f.comment });
    }
    if (net !== 0) lines.push({ gl: offset.gl, glId: offset.id, loc: s.loc, locId: s.id, side: net > 0 ? 'debit' : 'credit', amount: Math.abs(net), comment: feeComment });
    stores.push({ loc: s.loc, total: net, days: mine.map(f => ids.accounts[f.acct].label + ' ' + r2(f.fee).toFixed(2)) });
  }
  const dr = r2(lines.filter(l => l.side === 'debit').reduce((t, l) => t + l.amount, 0));
  return { date, number, comment, total: dr, stores, lines };
};

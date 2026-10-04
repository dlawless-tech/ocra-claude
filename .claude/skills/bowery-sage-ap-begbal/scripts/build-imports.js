// Usage: node build-imports.js <tab> <sage.json> <aging.csv> <gl.csv> <outdir> <suffix>
// Diffs one Sage store tab against R365 (AP Aging + the store's card account GL detail) and writes
// "<Store> Bank Withdrawal - Beg Bal <suffix>.csv" and "<Store> Bank Deposit - Beg Bal <suffix>.csv".
const fs = require('fs'), path = require('path');
const [tab, sageF, agingF, glF, outdir, suffix] = process.argv.slice(2);
const store = require('./stores.json').find(s => s.tab.toLowerCase() === (tab || '').toLowerCase());
if (!store || !suffix) { console.error('usage: build-imports.js <tab> <sage.json> <aging.csv> <gl.csv> <outdir> <suffix>'); process.exit(1); }
const sage = JSON.parse(fs.readFileSync(sageF, 'utf8'));
const parse = l => { const o = []; let c = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(c); c = ''; } else c += ch; } o.push(c); return o; };
const report = f => { const L = fs.readFileSync(f, 'utf8').split(/\r?\n/); const H = parse(L[3]); return L.slice(4).filter(Boolean).map(parse).map(r => Object.fromEntries(H.map((h, i) => [h, r[i]]))); };
const n = x => Math.round((+String(x || '').replace(/,/g, '') || 0) * 100) / 100;
// the importer stores an apostrophe doubled (AMY''S BREAD)
const norm = s => (s || '').replace(/''/g, "'").replace(/\s+/g, ' ').trim().toUpperCase();
const aging = report(agingF), gl = report(glF);
// each GL transaction lists twice (Dr and Cr on the card account); one entry per transaction
const glTx = {};
for (const r of gl) { const k = [r.TrxType, r.TrxNumber, r.TrxDate, r.TrxCompany, r.Comment].join('|'); glTx[k] = glTx[k] || { type: r.TrxType, doc: norm(r.TrxType === 'Bank Deposit' ? r.Comment : r.TrxCompany), amt: Math.max(n(r.Debit), n(r.Credit)) }; }
const pool = Object.values(glTx);
const take = (type, doc, amt) => { const i = pool.findIndex(t => t.type === type && t.doc === doc && t.amt === amt); return i >= 0 ? pool.splice(i, 1)[0] : null; };
const agingDocs = aging.filter(r => r.Number).map(r => ({ doc: norm(r.Number), amt: n(r.AmountCurrent) + n(r.Amount30) + n(r.Amount60) + n(r.Amount90) + n(r.Amount91), vendor: r.VendorName }));
const isCard = i => /CHASE/i.test(i.vendor);
const out = { inR365Ap: [], onCard: [], withdrawals: [], deposits: [], apMissing: [] };
for (const i of sage) {
  if (isCard(i)) {
    const hit = i.type === 'CR' ? take('Bank Deposit', i.doc.toUpperCase(), -i.amount) : take('Bank Expense', i.doc.toUpperCase(), i.amount);
    if (hit) out.onCard.push(i); else (i.type === 'CR' ? out.deposits : out.withdrawals).push(i);
  } else {
    const k = agingDocs.findIndex(a => a.doc === i.doc.toUpperCase() && a.amt === i.amount);
    if (k >= 0) { agingDocs.splice(k, 1); out.inR365Ap.push(i); } else out.apMissing.push(i);
  }
}
const sum = a => a.reduce((x, i) => x + i.amount, 0).toFixed(2);
const csvq = s => /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
const name = store.tab.replace(/ AP$/, '');
const write = (kind, head, rows) => { if (!rows.length) return; const f = path.join(outdir, `${name} Bank ${kind} - Beg Bal ${suffix}.csv`); fs.writeFileSync(f, [head, ...rows].join('\n') + '\n'); console.log('wrote ' + f); };
write('Withdrawal', 'Number,Amount,Date,Checking Account,Check Memo,Paid To,Location',
  out.withdrawals.map(i => ['CC', i.amount.toFixed(2), i.date, store.account, 'From Sage', csvq(i.doc), store.location].join(',')));
write('Deposit', 'Checking Account,Number,Date,Check Memo,Amount,Location',
  out.deposits.map(i => [store.account, 'CC', i.date, csvq(i.doc), (-i.amount).toFixed(2), store.location].join(',')));
console.log(`Sage ${sage.length} items ${sum(sage)}`);
console.log(`  card, already on ${store.card}: ${out.onCard.length} ${sum(out.onCard)}`);
console.log(`  card, to withdraw: ${out.withdrawals.length} ${sum(out.withdrawals)}`);
console.log(`  card, to deposit: ${out.deposits.length} ${sum(out.deposits)}`);
console.log(`  AP, matched on R365 aging: ${out.inR365Ap.length} ${sum(out.inR365Ap)}`);
console.log(`  AP, missing from R365 aging: ${out.apMissing.length} ${sum(out.apMissing)}`);
out.apMissing.forEach(i => console.log(`    ${i.vendor} | ${i.date} | ${i.type} ${i.doc} | ${i.amount.toFixed(2)}`));
agingDocs.forEach(a => console.log(`  R365 aging only: ${a.vendor} | ${a.doc} | ${a.amt.toFixed(2)}`));
const extra = pool.filter(t => t.doc !== '' && !/^(Bank Transfer|Journal Entry|AP Payment)$/.test(t.type));
console.log(`  ${store.card} transactions with no Sage item: ${extra.length} (expected: activity after go-live)`);

// Build one store's work-file record from its Grubhub figures, its R365 debits D, and the entry as read-entry.sh printed it.
// usage: node plan.js <figures.json> <store> <D> <entry.json>   -> {loc, id, tot, lines, warnings} on stdout
// Lines are keyed by the template's own comment text. A category with no template line goes to its nearest sibling and is named in warnings.
const fs = require('fs');
const [FIG, STORE, D, ENTRY] = process.argv.slice(2);
const f = JSON.parse(fs.readFileSync(FIG, 'utf8')).find(x => x.store === STORE) || {net: 0, cat: {}};
const e = JSON.parse(fs.readFileSync(ENTRY, 'utf8'));
const r2 = x => Math.round(x * 100) / 100;
// template comment -> category
const KIND = [[/ar balance|deposit|payout/, 'ar'], [/^commissions?$/, 'commissions'], [/delivery/, 'delivery commissions'], [/processing/, 'order processing fees'],
  [/reward/, 'rewards'], [/promo/, 'targeted promotions'], [/adjust/, 'account adjustments'], [/refund/, 'refunds'], [/discrepanc|difference/, 'discrepancy']];
const kind = l => (KIND.find(([re]) => re.test(l.comment.toLowerCase())) || [])[1] || (/10125/.test(l.account) ? 'ar' : null);
const warnings = [];
const byKind = {};
for (const l of e.lines) { const k = kind(l); if (!k) { warnings.push('template line not recognized: ' + l.account + ' "' + l.comment + '", left at 0'); continue; } if (byKind[k]) { warnings.push('second "' + k + '" line "' + l.comment + '" left at 0'); continue; } byKind[k] = l.comment; }
if (!byKind.ar) { console.log(JSON.stringify({fail: 'template has no 10125 line'})); process.exit(1); }
const amt = {ar: -r2(D - f.net)};
for (const [k, v] of Object.entries(f.cat)) amt[k] = r2(v);
// fees with no line of their own land on commissions; refunds on the discrepancy line (both 42060)
const FALLBACK = {rewards: 'commissions', 'targeted promotions': 'commissions', 'account adjustments': 'commissions', 'delivery commissions': 'commissions', 'order processing fees': 'commissions', refunds: 'discrepancy'};
for (const k of Object.keys(f.cat)) if (!byKind[k] && amt[k]) {
  const to = FALLBACK[k]; if (!byKind[to]) { console.log(JSON.stringify({fail: 'no line for ' + k + ' or ' + to})); process.exit(1); }
  amt[to] = r2((amt[to] || 0) + amt[k]); warnings.push(k + ' ' + amt[k].toFixed(2) + ' put on "' + byKind[to] + '", template has no line for it'); delete amt[k];
}
if (!byKind.discrepancy) { console.log(JSON.stringify({fail: 'template has no discrepancy line'})); process.exit(1); }
// discrepancy plugs D - net against the fees and refunds, debit when positive
amt.discrepancy = r2(-amt.ar - Object.entries(amt).filter(([k]) => k !== 'ar' && k !== 'discrepancy').reduce((a, [, v]) => a + v, 0) + (amt.discrepancy || 0));
const lines = Object.entries(byKind).map(([k, comment]) => { const v = amt[k] || 0; return {comment, col: v < 0 ? 'credit' : 'debit', amount: Math.abs(v)}; });
const tot = r2(lines.filter(l => l.col === 'debit').reduce((a, l) => a + l.amount, 0));
const cr = r2(lines.filter(l => l.col === 'credit').reduce((a, l) => a + l.amount, 0));
if (tot !== cr) { console.log(JSON.stringify({fail: 'does not balance ' + tot + '/' + cr})); process.exit(1); }
if (Math.abs(amt.discrepancy) >= 1) warnings.push('discrepancy ' + amt.discrepancy.toFixed(2));
console.log(JSON.stringify({loc: STORE, id: e.id, tot, lines, warnings}));

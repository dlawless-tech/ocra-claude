// Build the import CSV that clears each store's 20100 difference at the recon's end date.
// usage: node build-clear.js <recon.json> <out.csv> [--ez "<store>=<amt>"]... [--leave "<store>=<amt>"]...
//   --ez     part of a store's difference that is a cancelled EZ Cater order: credits 10150 - EZ Cater
//   --leave  part the human keeps in 20100 (not cleared)
// The rest of each store's difference goes to 42060 Customer Refund. Prints the plan; writes nothing when no store needs an entry.
const fs = require('fs');
const [reconF, outF, ...args] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(reconF));
const LOC = { '1 - MX': 10100, '2 - SLU': 10400, '3 - Skinker': 10300, '4 - Page': 10200, '5 - Fenton': 10700, '6 - Kirkwood': 10800, '7 - Spirit': 10900 };
const r2 = n => Math.round(n * 100) / 100, f = n => n.toFixed(2);
const opt = { '--ez': {}, '--leave': {} };
for (let i = 0; i < args.length; i += 2) {
  const m = (args[i + 1] || '').match(/^(.+)=(-?[\d.]+)$/);
  if (!opt[args[i]] || !m || !LOC[m[1]]) { console.error('STOP: bad option ' + args[i] + ' ' + args[i + 1]); process.exit(2); }
  opt[args[i]][m[1]] = r2((opt[args[i]][m[1]] || 0) + +m[2]);
}
const [y, mo, d] = r.end.split('-'); const date = `${+mo}/${+d}/${y}`, num = `20100 Recon ${+mo}.${+d}`;
const rows = ['JENumber,Type,Date,ReversalDate,JEComment,JELocation,Account,Debit,Credit,DetailLocation,DetailComment'];
let n = 0, tot = 0;
for (const s of r.stores) {
  if (Math.abs(s.unexplained) >= 0.005) { console.error(`STOP: ${s.store} has ${f(s.unexplained)} unexplained; find it before clearing`); process.exit(2); }
  const clear = r2(s.diff - (opt['--leave'][s.store] || 0)), ez = opt['--ez'][s.store] || 0, rest = r2(clear - ez);
  if (Math.abs(clear) < 0.005 && Math.abs(ez) < 0.005) { console.log(`${s.store.padEnd(13)} ties, no entry`); continue; }
  const l = LOC[s.store]; n++; tot = r2(tot + clear);
  const line = (acct, v, cm) => rows.push([num, 'Standard', date, '', 'Clear 20100 Customer Advance Orders to Toast', l, acct, v > 0 ? f(v) : '', v < 0 ? f(-v) : '', l, cm].join(','));
  line('20100', clear, `Clear residue to Toast open advance orders ${date}`);
  if (ez) line('10150', -ez, 'EZ Cater order cancelled in Toast');
  if (Math.abs(rest) >= 0.005) line('42060', -rest, 'Late payment residue');
  console.log(`${s.store.padEnd(13)} 20100 ${f(clear).padStart(9)}  10150 ${f(-ez).padStart(9)}  42060 ${f(-rest).padStart(9)}`);
}
console.log(`${num}: ${n} entries, 20100 ${f(tot)}`);
if (n) fs.writeFileSync(outF, rows.join('\n') + '\n');

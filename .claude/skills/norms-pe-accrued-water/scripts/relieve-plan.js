// Plan the invoice relief: each bill posted after <from> takes the store's accrual balance, the rest to expense.
// Usage: [UTIL=electric] node relieve-plan.js <rowsAccrual.json> <rowsExpense.json> <from M/D/YYYY> [skip store,...] > relieve.json
// Walks each store in date order: accrual JEs build the balance, a bill date zeroes it.
// Bills on one date share the balance pro rata to their bill totals.
const fs = require("fs");
const [fA, fE, from, skip = ""] = process.argv.slice(2);
const r2 = x => Math.round(x * 100) / 100;
const dv = s => { const [m, d, y] = s.split("/").map(Number); return y * 10000 + m * 100 + d; };
const skips = skip.split(",").map(s => s.trim()).filter(Boolean);
const RA = JSON.parse(fs.readFileSync(fA)), RE = JSON.parse(fs.readFileSync(fE));
const out = [];
for (const loc of [...new Set(RA.map(r => r.loc))]) {
  if (skips.includes(loc)) continue;
  let bal = r2(RA.filter(r => r.loc === loc && dv(r.dt) <= dv(from)).reduce((s, r) => s + r.cr - r.dr, 0));
  const later = RA.filter(r => r.loc === loc && dv(r.dt) > dv(from));
  const bills = [...later, ...RE.filter(r => r.loc === loc && dv(r.dt) > dv(from))].filter(r => r.type === "AP Invoice");
  for (const dt of [...new Set(later.map(r => r.dt).concat(bills.map(r => r.dt)))].sort((a, b) => dv(a) - dv(b))) {
    for (const r of later.filter(r => r.dt === dt && r.type !== "AP Invoice")) bal = r2(bal + r.cr - r.dr);
    const inv = {};
    for (const r of bills.filter(r => r.dt === dt)) {
      const k = r.id || r.ref;
      inv[k] = inv[k] || { loc, dt, id: r.id, ref: r.ref, text: r.text, aAcc: 0, aExp: 0 };
      inv[k][RA.includes(r) ? "aAcc" : "aExp"] += r.dr - r.cr;
    }
    const L = Object.values(inv);
    if (!L.length) continue;
    const tot = L.reduce((s, i) => s + i.aAcc + i.aExp, 0);
    let left = bal;
    L.forEach((i, ix) => {
      i.tot = r2(i.aAcc + i.aExp); i.bal = bal;
      i.newAcc = ix === L.length - 1 ? r2(left) : r2(bal * i.tot / tot);
      left = r2(left - i.newAcc);
      i.newExp = r2(i.tot - i.newAcc);
      i.change = r2(i.newAcc - i.aAcc) !== 0;
      out.push(i);
    });
    bal = 0;
  }
}
for (const i of out) console.error([i.loc.padEnd(21), i.dt.padEnd(10), i.ref.padEnd(12), "bal " + i.bal.toFixed(2).padStart(9), "bill " + i.tot.toFixed(2).padStart(9), "| acc " + i.aAcc.toFixed(2) + " -> " + i.newAcc.toFixed(2), "| exp " + i.newExp.toFixed(2), i.id ? "" : "NO ID", i.change ? "" : "(no change)"].join(" "));
process.stdout.write(JSON.stringify(out));

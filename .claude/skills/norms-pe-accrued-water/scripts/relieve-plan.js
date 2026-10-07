// Plan the invoice relief: each water bill posted after <from> takes the store's 2285 balance, the rest to 5635.
// Usage: node relieve-plan.js <rows2285.json> <rows5635.json> <from M/D/YYYY> [skip store,...] > relieve.json
// Walks each store in date order: accrual JEs build the balance, a bill date zeroes it.
// Bills on one date share the balance pro rata to their water totals.
const fs = require("fs");
const [f85, f35, from, skip = ""] = process.argv.slice(2);
const r2 = x => Math.round(x * 100) / 100;
const dv = s => { const [m, d, y] = s.split("/").map(Number); return y * 10000 + m * 100 + d; };
const skips = skip.split(",").map(s => s.trim()).filter(Boolean);
const R85 = JSON.parse(fs.readFileSync(f85)), R35 = JSON.parse(fs.readFileSync(f35));
const out = [];
for (const loc of [...new Set(R85.map(r => r.loc))]) {
  if (skips.includes(loc)) continue;
  let bal = r2(R85.filter(r => r.loc === loc && dv(r.dt) <= dv(from)).reduce((s, r) => s + r.cr - r.dr, 0));
  const later = R85.filter(r => r.loc === loc && dv(r.dt) > dv(from));
  const bills = [...later, ...R35.filter(r => r.loc === loc && dv(r.dt) > dv(from))].filter(r => r.type === "AP Invoice");
  for (const dt of [...new Set(later.map(r => r.dt).concat(bills.map(r => r.dt)))].sort((a, b) => dv(a) - dv(b))) {
    for (const r of later.filter(r => r.dt === dt && r.type !== "AP Invoice")) bal = r2(bal + r.cr - r.dr);
    const inv = {};
    for (const r of bills.filter(r => r.dt === dt)) {
      const k = r.id || r.ref;
      inv[k] = inv[k] || { loc, dt, id: r.id, ref: r.ref, text: r.text, a2285: 0, a5635: 0 };
      inv[k][R85.includes(r) ? "a2285" : "a5635"] += r.dr - r.cr;
    }
    const L = Object.values(inv);
    if (!L.length) continue;
    const tot = L.reduce((s, i) => s + i.a2285 + i.a5635, 0);
    let left = bal;
    L.forEach((i, ix) => {
      i.tot = r2(i.a2285 + i.a5635); i.bal = bal;
      i.new2285 = ix === L.length - 1 ? r2(left) : r2(bal * i.tot / tot);
      left = r2(left - i.new2285);
      i.new5635 = r2(i.tot - i.new2285);
      i.change = r2(i.new2285 - i.a2285) !== 0;
      out.push(i);
    });
    bal = 0;
  }
}
for (const i of out) console.error([i.loc.padEnd(21), i.dt.padEnd(10), i.ref.padEnd(12), "bal " + i.bal.toFixed(2).padStart(9), "bill " + i.tot.toFixed(2).padStart(9), "| 2285 " + i.a2285.toFixed(2) + " -> " + i.new2285.toFixed(2), "| 5635 " + i.new5635.toFixed(2), i.id ? "" : "NO ID", i.change ? "" : "(no change)"].join(" "));
process.stdout.write(JSON.stringify(out));

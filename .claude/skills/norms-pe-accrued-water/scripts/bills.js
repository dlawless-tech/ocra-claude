// List every water bill by store: full water amount (2285 + 5635 parts) and the service period text.
// Usage: node bills.js <rows2285.json> <rows5635.json> [store]
// The service period sits in the comment ("SERVICE PERIOD 8/19-9/18", "BILLING DATES ..."); some bills carry none.
const fs = require("fs");
const [a, b, only] = process.argv.slice(2);
const dv = s => { const [m, d, y] = s.split("/").map(Number); return y * 10000 + m * 100 + d; };
const bills = {};
for (const [f, acct] of [[a, "2285"], [b, "5635"]])
  for (const r of JSON.parse(fs.readFileSync(f))) {
    if (r.type !== "AP Invoice" || (only && r.loc !== only)) continue;
    const k = r.id || r.loc + r.dt + r.ref;
    bills[k] = bills[k] || { loc: r.loc, dt: r.dt, ref: r.ref, text: "", a2285: 0, a5635: 0 };
    bills[k]["a" + acct] += r.dr - r.cr;
    if (r.text.length > bills[k].text.length) bills[k].text = r.text;
  }
const L = Object.values(bills).sort((x, y) => x.loc.localeCompare(y.loc) || dv(x.dt) - dv(y.dt));
for (const x of L) console.log([x.loc.padEnd(21), x.dt.padEnd(10), x.ref.padEnd(12), (x.a2285 + x.a5635).toFixed(2).padStart(10), "(2285 " + x.a2285.toFixed(2) + ")", x.text].join(" "));

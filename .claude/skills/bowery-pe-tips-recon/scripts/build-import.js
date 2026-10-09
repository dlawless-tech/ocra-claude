// Build the period-end tips import from a 210-00 GL Account Detail CSV.
// usage: node build-import.js <gl.csv> <period label, e.g. P9'26> <period end M/D/YYYY> <out dir>
// Writes <out dir>/import.csv and <out dir>/plan.json. Prints STOP: and writes nothing on a bad read.
const fs = require("fs");
const path = require("path");
const [glFile, label, end, out] = process.argv.slice(2);
if (!out) { console.error("usage: build-import.js <gl.csv> <label> <M/D/YYYY> <out dir>"); process.exit(2); }

const LOCS = { "Cookshop": 200, "Shuka": 400, "Rosie's": 500, "Shukette": 600, "Vic's": 700, "Bowery Group": 800 };
const TIPS = "210-00", FEES = "632-00";
const number = `${label} AJEs`;
const stop = m => { console.log("STOP: " + m); process.exit(1); };

const csv = s => { const o = []; let c = "", q = false; for (const ch of s) { if (ch === '"') { q = !q; continue; } if (ch === "," && !q) { o.push(c); c = ""; continue; } c += ch; } o.push(c); return o; };
const num = s => +String(s || 0).replace(/,/g, "");
const cents = x => Math.round(x * 100);
const lines = fs.readFileSync(glFile, "utf8").split(/\r?\n/);
const head = lines.findIndex(l => l.startsWith("LocationName1,"));
if (head < 0) stop("no detail header in " + glFile);
const H = csv(lines[head]), ix = k => H.indexOf(k);
if (!/210-00 - Tips Payable/.test(lines[1] || "")) stop("report is not 210-00 Tips Payable");
const endD = new Date(end);

const bal = {}, prior = {}, last = {};
for (const l of lines.slice(head + 1)) {
  if (!l.trim()) continue;
  const r = csv(l);
  const loc = r[ix("LocationName")].replace(/’/g, "'");
  const dt = r[ix("TrxDate")];
  if (!loc || !dt) continue;
  if (!(loc in LOCS)) stop("location not mapped: " + loc);
  if (new Date(dt) > endD) stop(`line dated ${dt} is after the period end`);
  bal[loc] = (bal[loc] || 0) + cents(num(r[ix("Credit")]) - num(r[ix("Debit")]));
  const nb = r[ix("TrxNumber")];
  if (nb === number) prior[loc] = (prior[loc] || 0) + 1;
  if (dt === end && /^(Payroll|Weekly Log)/.test(nb)) (last[loc] = last[loc] || new Set()).add(nb.split(" ")[0]);
}
// final week's payroll and cash log must be in, or the zeroing misses them
if (!process.argv.includes("--no-week-check"))
  for (const loc of Object.keys(LOCS).filter(l => l !== "Bowery Group"))
    for (const k of ["Payroll", "Weekly"])
      if (!last[loc] || !last[loc].has(k)) stop(`${loc} has no ${k === "Weekly" ? "Weekly Log - Deposits, Tips, Paid Outs" : "Payroll"} entry on 210-00 dated ${end}`);

const money = c => (Math.abs(c) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const q = s => /[",]/.test(s) ? `"${s}"` : s;
const rows = ["JENumber,Type,Date,ReversalDate,JEComment,JELocation,Account,Debit,Credit,DetailLocation,DetailComment"];
const plan = { label, number, date: end, entries: [], skipped: [] };
for (const loc of Object.keys(LOCS)) {
  const c = bal[loc] || 0, n = LOCS[loc];
  if (c === 0) { if (loc in bal) plan.skipped.push({ location: loc, reason: prior[loc] ? `already zero with ${number}` : "already zero" }); continue; }
  if (prior[loc]) stop(`${loc} already has ${number} on 210-00 and still carries ${(c / 100).toFixed(2)}`);
  // credit balance: tips held over, clear to fees; debit balance: tips overpaid, reverse
  const [tDr, tCr] = c > 0 ? [money(c), ""] : ["", money(c)];
  rows.push([number, "Standard", end, "", "", n, TIPS, q(tDr), q(tCr), n, ""].join(","));
  rows.push([number, "Standard", end, "", "", n, FEES, q(tCr), q(tDr), n, ""].join(","));
  plan.entries.push({ location: loc, locationNumber: n, balance: c / 100, amount: Math.abs(c) / 100, side: c > 0 ? "credit" : "debit" });
}
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "import.csv"), rows.join("\r\n") + "\r\n");
fs.writeFileSync(path.join(out, "plan.json"), JSON.stringify(plan, null, 2));
for (const e of plan.entries) console.log(`${e.location.padEnd(10)} 210-00 ${e.side} balance ${e.amount.toFixed(2)} -> ${e.side === "credit" ? "Dr 210-00 / Cr 632-00" : "Dr 632-00 / Cr 210-00"}`);
for (const s of plan.skipped) console.log(`${s.location.padEnd(10)} skipped, ${s.reason}`);
console.log(`total ${plan.entries.reduce((a, e) => a + e.amount, 0).toFixed(2)} in ${plan.entries.length} entries`);

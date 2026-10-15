// GL Account Detail CSV from gl-detail.sh -> {location: {D, beg, days: {YYYY-MM-DD: journal entry debits}}}
// usage: node gl-days.js <gl.csv>
const fs = require("fs");
const parse = l => { const o = []; let c = "", q = false; for (const ch of l) { if (ch == '"') { q = !q; continue } if (ch == ',' && !q) { o.push(c); c = ""; continue } c += ch } o.push(c); return o };
const n = s => parseFloat(String(s).replace(/,/g, "")) || 0;
const iso = d => { const [m, dd, y] = d.split("/"); return y + "-" + m.padStart(2, "0") + "-" + dd.padStart(2, "0") };
const rows = fs.readFileSync(process.argv[2], "utf8").split(/\r?\n/).slice(4).filter(Boolean).map(parse);
const out = {};
// cols: 0 location, 2 beg bal, 5 date, 6 type, 12 debit
for (const r of rows) {
  const o = out[r[0]] = out[r[0]] || { D: 0, beg: n(r[2]), days: {} };
  o.D = +(o.D + n(r[12])).toFixed(2);
  if (r[6] === "Journal Entry" && n(r[12]) > 0) { const k = iso(r[5]); o.days[k] = +((o.days[k] || 0) + n(r[12])).toFixed(2); }
}
console.log(JSON.stringify(out, null, 1));

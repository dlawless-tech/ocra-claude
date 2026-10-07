// Parse gl-detail.sh output into one JSON row per GL line, with the transaction id.
// Usage: node rows.js <cells file> > rows.json   (reads <cells file>.snap for ids)
// Row: {loc, dt, type, ref, text, dr, cr, id}. text holds vendor + comment cells.
const fs = require("fs");
const f = process.argv[2];
const L = fs.readFileSync(f, "utf8").split(/\r?\n/);
const n = s => +String(s).replace(/,/g, "");
const isDate = s => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s);
const isNum = s => /^-?[\d,]+\.\d\d$/.test(s);
const rows = [];
let loc = "", cur = null;
const flush = () => {
  if (!cur) return;
  const c = cur.cells, k = c.length;
  if (k >= 6 && isNum(c[k - 1]) && isNum(c[k - 2]) && isNum(c[k - 3]))
    rows.push({ loc, dt: c[0], type: c[1], ref: c[2], text: c.slice(3, k - 3).filter(x => x !== loc).join(" | "), dr: n(c[k - 3]), cr: n(c[k - 2]) });
  cur = null;
};
for (let i = 0; i < L.length; i++) {
  const s = L[i];
  if (/^\d{4} - /.test(s) && L[i + 1] === "Beg Balance:") { flush(); loc = L[i - 1]; continue; }
  if (/^Total /.test(s) || s === "Grand Total") { flush(); continue; }
  if (isDate(s) && /^(Journal Entry|AP Invoice|AP Credit Memo|Bank Expense|Bank Deposit)$/.test(L[i + 1] || "")) { flush(); cur = { cells: [s] }; continue; }
  if (cur) cur.cells.push(s);
}
flush();

// ids: split the raw snapshot into report rows, each row's cells plus its link url
const snap = fs.existsSync(f + ".snap") ? fs.readFileSync(f + ".snap", "utf8").split(/\r?\n/) : [];
const blocks = [];
let blk = null;
for (const s of snap) {
  if (/- row \[ref=/.test(s)) { blk = { cells: [], id: null }; blocks.push(blk); continue; }
  if (!blk) continue;
  const c = s.match(/(cell|generic|link) "([^"]*)"/); if (c) blk.cells.push(c[2]);
  const m = s.match(/entityId=([0-9a-f-]+)/); if (m) blk.id = m[1];
}
const money = x => x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
for (const r of rows) {
  const ids = [...new Set(blocks.filter(b => b.id && b.cells[0] === r.dt && b.cells.some(t => t.startsWith(r.ref.trim())) && b.cells.includes(r.loc) && b.cells.includes(money(r.dr)) && b.cells.includes(money(r.cr))).map(b => b.id))];
  r.id = ids.length === 1 ? ids[0] : null;
}
process.stdout.write(JSON.stringify(rows));

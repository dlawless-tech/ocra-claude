// GL Account Detail csv (10150, subtotal by location) -> rows per store, deduped.
// usage: gl-rows.js <gl.csv> > gl.json
const fs = require('fs');
const P = l => { const o = []; let c = '', q = 0; for (const ch of l) { if (ch === '"') { q = !q; continue } if (ch === ',' && !q) { o.push(c); c = ''; continue } c += ch } o.push(c); return o };
const n = s => +String(s).replace(/,/g, '') || 0;
const seen = new Set(), out = {};
for (const l of fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/)) {
  const r = P(l); if (!/^10150 /.test(r[1] || '') || !r[5]) continue;
  const k = r.slice(5, 14).join('|'); if (seen.has(k)) continue; seen.add(k);
  const store = r[0].replace(/.* - /, '');
  (out[store] ??= []).push({ date: r[5], type: r[6], number: r[7], comment: r[10], debit: n(r[12]), credit: n(r[13]) });
}
console.log(JSON.stringify(out, null, 1));

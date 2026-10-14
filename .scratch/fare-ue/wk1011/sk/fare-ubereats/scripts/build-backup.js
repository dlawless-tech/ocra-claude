#!/usr/bin/env node
// Write one store's backup page: the entry as posted, Uber's Earnings rows behind each line, the payout
// tie, and the Uber Earnings screenshot. Render it to PDF with render-backup.sh.
//
//   build-backup.js <week.txt> <readback.txt> "<uber store>" <screenshot.png> <out.html>
//
// readback.txt is read-lines.js run on the saved entry, so the page shows what R365 holds. Prints
// "<store>\tties", or "<store>\tDOES NOT TIE ..." and exits nonzero.
const fs = require('fs');
const { c, money, parseWeek, mapStore } = require('./breakdown');
const [weekFile, rbFile, store, png, out] = process.argv.slice(2);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const apo = v => String(v || '').split('’').join("'");

const b = parseWeek(weekFile).find(x => x.name === store);
if (!b) { console.error(`no block for "${store}" in ${weekFile}`); process.exit(1); }
const m = mapStore(b);
let rb = fs.readFileSync(rbFile, 'utf8');
rb = rb.slice(rb.indexOf('"{'), rb.lastIndexOf('}"') + 2);
const e = JSON.parse(JSON.parse(rb));
const signed = l => c((l.dr || 0) - (l.cr || 0));

const diffs = [];
if (m.stop) diffs.push(m.stop);
const want = m.lines || [], used = new Set();
for (const w of want) {
  const i = e.lines.findIndex((l, j) => !used.has(j) && apo(l.a) === w.gl && (l.c || '') === w.comment && signed(l));
  if (i < 0) { diffs.push(`${w.gl} "${w.comment}" ${w.amt} not on the entry`); continue; }
  used.add(i);
  if (Math.abs(signed(e.lines[i]) - w.amt) > 0.005) diffs.push(`${w.gl} "${w.comment}" entry ${signed(e.lines[i])}, Uber ${w.amt}`);
}
e.lines.forEach((l, j) => { if (!used.has(j) && signed(l)) diffs.push(`entry line ${l.a} ${signed(l)} has no Uber row`); });
const ties = !diffs.length;
console.log(`${store}\t${ties ? 'ties' : 'DOES NOT TIE ' + diffs.join('; ')}`);

const dr = c(e.lines.reduce((t, l) => t + (l.dr || 0), 0)), cr = c(e.lines.reduce((t, l) => t + (l.cr || 0), 0));
const entry = e.lines.map(l => `<tr><td>${esc(apo(l.a))}</td><td class=n>${l.dr ? money(l.dr) : ''}</td><td class=n>${l.cr ? money(l.cr) : ''}</td><td>${esc(l.c || '')}</td></tr>`).join('');
const map = want.map(w => `<tr><td>${w.src.map(esc).join('<br>')}</td><td>${esc(w.gl)}${w.comment ? ` (${esc(w.comment)})` : ''}</td><td class=n>${w.amt > 0 ? money(w.amt) : ''}</td><td class=n>${w.amt < 0 ? money(-w.amt) : ''}</td></tr>`).join('')
  || '<tr><td colspan=4>No sales this week: every Uber figure is zero and every entry line is 0.00.</td></tr>';
const tie = b.rows.filter(r => r.depth === 0).map(r => `<tr><td>${esc(r.label)}</td><td class=n>${money(r.amt)}</td></tr>`).join('');
// screenshot in page-height slices; a print engine does not split one tall image
const shot = png && fs.existsSync(png) ? fs.readFileSync(png) : null;
const SLICE = 900, H = shot ? shot.readUInt32BE(20) : 0, src = shot ? `data:image/png;base64,${shot.toString('base64')}` : '';
const img = shot ? '<h2 class=pb>Uber Eats Manager, Financials &gt; Earnings, as captured</h2>' + Array.from({ length: Math.ceil(H / SLICE) }, (_, i) =>
  `<div class=sl style="height:${Math.min(SLICE, H - i * SLICE)}px"><img src="${src}" style="margin-top:-${i * SLICE}px"></div>`).join('') : '';

fs.writeFileSync(out, `<!doctype html><meta charset=utf-8><title>Uber Eats ${esc(store)} ${esc(e.date)}</title>
<style>body{font:11px Arial,sans-serif;margin:24px;color:#111}h1{font-size:16px;margin:0 0 4px}h2{font-size:12px;margin:18px 0 6px}
p{margin:2px 0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:3px 6px;text-align:left;vertical-align:top}th{background:#eee}
.n{text-align:right;white-space:nowrap}tr.t td{font-weight:bold;background:#f5f5f5}.ok{color:#06622b;font-weight:bold}.no{color:#a00;font-weight:bold}
.half{width:55%}.pb{page-break-before:always}.sl{overflow:hidden;break-inside:avoid;border:1px solid #bbb;width:fit-content}.sl img{display:block}</style>
<h1>${esc(store)}: Uber Eats fees, week ${esc(b.range)}</h1>
<p>Journal entry <b>${esc(e.number)}</b> dated ${esc(e.date)}, location ${esc(apo((e.lines[0] || {}).loc || ''))}. Source: Uber Eats Manager, Financials &gt; Earnings, custom range ${esc(b.range)}.</p>
<p class=${ties ? 'ok' : 'no'}>${ties ? 'Ties: every entry line equals its Uber figures, and the breakdown adds to Net sales.' : 'DOES NOT TIE: ' + esc(diffs.join('; '))}</p>
<h2>Journal entry as posted</h2>
<table><tr><th>GL account</th><th class=n>Debit</th><th class=n>Credit</th><th>Comment</th></tr>${entry}
<tr class=t><td>Total</td><td class=n>${money(dr)}</td><td class=n>${money(cr)}</td><td></td></tr></table>
<h2>Uber figures behind each line</h2>
<table><tr><th>Uber figure</th><th>Entry line</th><th class=n>Debit</th><th class=n>Credit</th></tr>${map}</table>
<h2>Payout tie</h2>
<table class=half>${tie}<tr class=t><td>Net sales (paid out)</td><td class=n>${money(b.net || 0)}</td></tr></table>
${img}
`);
process.exit(ties ? 0 : 1);

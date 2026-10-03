#!/usr/bin/env node
// Write one backup page per store: the entry, DoorDash's week totals mapped to its lines, the payout
// tie, the payout page captures and every DoorDash transaction behind it. Render with render-pdf.sh.
//
//   build-backup.js <report dir> <lines.json> <html out dir> [--posted <dir>] [--shots <dir>]
//
// --posted: <store>.json per store, the entry as R365 reads it back; the tie then checks R365, not lines.json.
// --shots: <payout id>.png and .txt per payout from capture-payout.sh; its tiles must match the report.
// Totals are recomputed from the report. Prints "<store>\tties" per store, or "<store>\tDOES NOT TIE ..."
// and exits nonzero. Zero stores get no page.
const fs = require('fs'), path = require('path');
const { read, COLS } = require('./report');
const STORES = require('./stores.json');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const POSTED = opt('--posted'), SHOTS = opt('--shots');
const [dir, linesFile, out] = args;
const L = JSON.parse(fs.readFileSync(linesFile, 'utf8'));
const det = read(dir, 'FINANCIAL_DETAILED_TRANSACTIONS'), pay = read(dir, 'FINANCIAL_PAYOUT_SUMMARY');
const c = v => Math.round(v * 100) / 100;
const n = (x, k) => +x[COLS[k]] || 0;
const sum = (rows, k) => c(rows.reduce((s, x) => s + n(x, k), 0));
const money = v => v ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const usd = d => { const [y, m, dd] = d.split('-'); return `${+m}/${+dd}/${y}`; };

// report column groups, each to the GL line it feeds (amounts as DoorDash signs them)
const GROUPS = [
  { gl: '4905 - Third Party App Marketing Comps', label: 'Customer discounts + DoorDash marketing credit + third-party contribution', keys: ['dYou', 'dDD', 'd3', 'ddc', 'tpc'] },
  { gl: '7540 - Doordash Marketing', label: 'Marketing fees', keys: ['mktf'] },
  { gl: '7310 - DoorDash Third Party Fees', label: 'Commission + payment processing fee', keys: ['comm', 'ppf'] },
  { gl: '7535 - Third Party Refunds', label: 'Error charges', keys: ['err'] },
];
const CLEAR = '1102 - DoorDash Deposit Clearing';

fs.mkdirSync(out, { recursive: true });
let bad = 0;
for (const s of L.stores) {
  if (s.zero) continue;
  const id = Object.keys(STORES).find(k => STORES[k][0] === s.store);
  const all = det.filter(x => x['Store ID'] === id);
  const wk = all.filter(x => x['Timestamp local date'] >= L.start && x['Timestamp local date'] <= L.end);
  const outside = all.filter(x => !wk.includes(x));
  const payouts = pay.filter(x => x['Store ID'] === id);

  if (POSTED) {
    const p = JSON.parse(fs.readFileSync(path.join(POSTED, s.store + '.json'), 'utf8'));
    if (p.date !== L.weekEnding) { console.log(`${s.store}\tDOES NOT TIE entry dated ${p.date}`); bad++; continue; }
    s.lines = p.lines.filter(l => l.dr || l.cr).map(l => ({ gl: l.a, side: l.dr ? 'debit' : 'credit', amount: l.dr || l.cr, comment: l.c }));
  }
  const groups = GROUPS.map(g => ({ ...g, amt: c(-g.keys.reduce((t, k) => t + sum(wk, k), 0)) }));
  const sub = sum(wk, 'sub'), net = sum(wk, 'net'), withheld = c(sub - net);
  const posted = gl => s.lines.filter(l => l.gl === gl).reduce((t, l) => t + (l.side === 'debit' ? l.amount : -l.amount), 0);
  const diffs = [...groups.map(g => [g.gl, g.amt, posted(g.gl)]), [CLEAR, -withheld, posted(CLEAR)]]
    .filter(([, want, got]) => Math.abs(want - got) > 0.005);
  const payNet = c(payouts.reduce((t, x) => t + (+x['Net total'] || 0), 0)), outNet = sum(outside, 'net');
  if (Math.abs(c(payNet - outNet) - net) > 0.005) diffs.push(['payout net', c(payNet - outNet), net]);
  // payout page tiles against the report, per payout id
  const shots = [];
  for (const pid of SHOTS ? [...new Set(payouts.map(x => x['Payout ID']))] : []) {
    const rows = all.filter(x => x['Payout ID'] === pid), prow = payouts.filter(x => x['Payout ID'] === pid);
    const txt = fs.readFileSync(path.join(SHOTS, pid + '.txt'), 'utf8').split(/\r?\n/);
    const tile = k => { const l = txt.find(x => x.startsWith(k + '|')); return l ? c(+l.split('|')[1].replace(/[$,]/g, '')) : NaN; };
    const want = { 'Sales': sum(rows, 'sub'), 'Commission & fees': c(sum(rows, 'comm') + sum(rows, 'ppf')),
      'Marketing spend': c(['mktf', ...GROUPS[0].keys].reduce((t, k) => t + sum(rows, k), 0)),
      'Amendments': c(sum(rows, 'err') + sum(rows, 'adj')), 'Net total': c(prow.reduce((t, x) => t + (+x['Net total'] || 0), 0)) };
    for (const [k, v] of Object.entries(want)) if (!(Math.abs(tile(k) - v) <= 0.005)) diffs.push([`payout ${pid} tile ${k}`, v, tile(k)]);
    shots.push({ pid, header: txt[0], want, png: fs.readFileSync(path.join(SHOTS, pid + '.png')).toString('base64') });
  }
  const ties = !diffs.length;
  if (!ties) bad++;
  console.log(`${s.store}\t${ties ? 'ties' : 'DOES NOT TIE ' + diffs.map(d => d.join(' ')).join('; ')}`);

  const dr = s.lines.reduce((t, l) => t + (l.side === 'debit' ? l.amount : 0), 0);
  const cr = s.lines.reduce((t, l) => t + (l.side === 'credit' ? l.amount : 0), 0);
  const entry = s.lines.map(l => `<tr><td>${esc(l.gl)}</td><td class=n>${l.side === 'debit' ? money(l.amount) : ''}</td><td class=n>${l.side === 'credit' ? money(l.amount) : ''}</td><td>${esc(l.comment)}</td></tr>`).join('');
  const map = groups.map(g => `<tr><td>${esc(g.label)}</td><td class=n>${money(-g.amt) || '0.00'}</td><td>${esc(g.gl)}</td><td class=n>${money(g.amt) || '0.00'}</td></tr>`).join('');
  const pays = payouts.map(x => `<tr><td>DoorDash payout ${esc(x['Payout ID'])}, paid ${usd(x['Payout date'])}</td><td class=n>${money(+x['Net total'])}</td></tr>`).join('');
  const outRow = outside.length ? `<tr><td>Less ${outside.length} transactions outside the week (${[...new Set(outside.map(x => usd(x['Timestamp local date'])))].join(', ')}), booked in the prior period</td><td class=n>${money(-outNet)}</td></tr>` : '';
  const txCols = [['Subtotal', x => n(x, 'sub')], ['Commission + fee', x => n(x, 'comm') + n(x, 'ppf')], ['Marketing fees', x => n(x, 'mktf')],
    ['Discounts net of credits', x => GROUPS[0].keys.reduce((t, k) => t + n(x, k), 0)], ['Error charges', x => n(x, 'err')], ['Net total', x => n(x, 'net')]];
  const tx = [...wk].sort((a, b) => a['Timestamp local time'].localeCompare(b['Timestamp local time'])).map(x =>
    `<tr><td>${usd(x['Timestamp local date'])}</td><td>${esc(x['Transaction type'])}</td><td>${esc(x['DoorDash order ID'])}</td>${txCols.map(([, f]) => `<td class=n>${money(c(f(x)))}</td>`).join('')}</tr>`).join('');
  const txTot = txCols.map(([, f]) => `<td class=n>${money(c(wk.reduce((t, x) => t + f(x), 0))) || '0.00'}</td>`).join('');

  fs.writeFileSync(path.join(out, `${s.store}.html`), `<!doctype html><meta charset=utf-8><title>DoorDash ${esc(s.store)} ${esc(L.weekEnding)}</title>
<style>body{font:11px Arial,sans-serif;margin:24px;color:#111}h1{font-size:16px;margin:0 0 4px}h2{font-size:12px;margin:18px 0 6px}
p{margin:2px 0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:3px 6px;text-align:left}th{background:#eee}
.n{text-align:right;white-space:nowrap}tr.t td{font-weight:bold;background:#f5f5f5}.ok{color:#06622b;font-weight:bold}.no{color:#a00;font-weight:bold}
.tx td{padding:1px 4px;font-size:9.5px}</style>
<h1>FARE ${esc(s.store)}: DoorDash fees, week ${usd(L.start)} to ${usd(L.end)}</h1>
<p>Journal entry <b>DoorDash</b> dated ${esc(L.weekEnding)}, location ${esc(s.loc)}. Source: DoorDash merchant portal financial report, by payout date.</p>
<p class=${ties ? 'ok' : 'no'}>${ties ? 'Ties: DoorDash report totals equal every entry line, and the week\'s net equals the payout.' : 'DOES NOT TIE: ' + esc(diffs.map(d => d.join(' ')).join('; '))}</p>
<h2>Journal entry</h2>
<table><tr><th>GL account</th><th class=n>Debit</th><th class=n>Credit</th><th>Comment</th></tr>${entry}
<tr class=t><td>Total</td><td class=n>${money(dr)}</td><td class=n>${money(cr)}</td><td></td></tr></table>
<h2>DoorDash report totals for the week, to the entry</h2>
<table><tr><th>DoorDash columns</th><th class=n>DoorDash amount</th><th>Entry line</th><th class=n>Debit</th></tr>${map}
<tr class=t><td>Total withheld by DoorDash = Subtotal ${money(sub)} less Net total ${money(net)}</td><td class=n>${money(-withheld)}</td><td>${CLEAR} (credit)</td><td class=n>${money(withheld)}</td></tr></table>
<h2>Payout tie</h2>
<table>${pays}${outRow}<tr class=t><td>Net total for the week (DoorDash transactions below)</td><td class=n>${money(net)}</td></tr></table>
${shots.map(x => `<h2 style="page-break-before:always">DoorDash payout page, payout ${esc(x.pid)}</h2><p>${esc(x.header)}</p>
<table><tr><th>Payout page tile</th><th class=n>Amount</th><th>Entry line</th></tr>
<tr><td>Sales</td><td class=n>${money(x.want['Sales']) || '0.00'}</td><td>1102 credit is Sales less Net total</td></tr>
<tr><td>Commission &amp; fees</td><td class=n>${money(x.want['Commission & fees']) || '0.00'}</td><td>7310</td></tr>
<tr><td>Marketing spend</td><td class=n>${money(x.want['Marketing spend']) || '0.00'}</td><td>4905 + 7540</td></tr>
<tr><td>Amendments (error charges)</td><td class=n>${money(x.want['Amendments']) || '0.00'}</td><td>7535</td></tr>
<tr class=t><td>Net total</td><td class=n>${money(x.want['Net total'])}</td><td></td></tr></table>
<img style="width:100%;border:1px solid #bbb;margin-top:6px" src="data:image/png;base64,${x.png}">`).join('')}
<h2 style="page-break-before:always">DoorDash transactions in the week (${wk.length})</h2>
<table class=tx><tr><th>Date</th><th>Type</th><th>Order ID</th>${txCols.map(([h]) => `<th class=n>${h}</th>`).join('')}</tr>${tx}
<tr class=t><td colspan=3>Total</td>${txTot}</tr></table>
`);
}
process.exit(bad ? 1 : 0);

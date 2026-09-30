#!/usr/bin/env node
// Turn one week of the Change Order Report into that week's journal entry lines.
//
//   read-report.js "<Change Order Report- M.D-M.D.xlsx>" > lines.json
//
// Column C (Chage Order Deposits) on each store tab posts; column D (received) does not.
// Stops on anything it cannot place rather than guessing.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const SHEETS = {
  AN: ['217 - Anaheim', '0184ee57-288c-4bd0-a40a-99617f534235'],
  CL: ['225 - Claremont', 'e755458d-3948-412d-9ce5-bb79569c04c7'],
  CM: ['220 - Costa Mesa', '3c591a6c-3174-4e51-ac3f-d6bd9180373c'],
  CR: ['263 - Carson', '5566d87b-86d5-419a-9b7d-00d7ea7084df'],
  DN: ['244 - Downey', 'c128c598-d7a3-49b3-91ce-8aba11ea244f'],
  EM: ['262 - El Monte', '6778c11e-fe6e-4bb2-90f0-22e8065d730b'],
  HW: ['269 - Hollywood', '72d6c464-4b5a-4b06-a723-72b6c0a26046'],
  HB: ['219 - Huntington Beach', '0545600a-ad8b-425c-ba65-2ca2e7e43530'],
  IG: ['264 - Inglewood', '469d05f9-b494-4bbf-91f7-68c97e66bffc'],
  LC: ['250 - La Cienega', 'ada0939c-683f-425b-8160-80b1f828aec1'],
  LK: ['215 - Lakewood', '6dcbe84a-d322-4121-819c-9e95fbee7901'],
  LV: ['272 - Las Vegas', '122dda46-43da-47e8-9dc3-8aeebd507771'],
  ON: ['270 - Ontario', '93f40990-6686-42a8-a145-4c46fcc8cc57'],
  OR: ['218 - Orange', '10871501-d0e5-485b-9b48-94d523395a9c'],
  PR: ['261 - Pico Rivera', '52100969-d713-4d9c-98c4-b08d00165501'],
  RL: ['265 - Rialto', '2e76328e-1731-48fb-b8ab-f68c79fd0014'],
  RV: ['245 - Riverside', '9d35968e-d643-499e-9d40-13f2e49b9256'],
  SA: ['243 - Santa Ana', 'b39c50e8-df51-4bce-8405-9b38b57e85e5'],
  SL: ['211 - Slauson', '91fe6665-1421-4c6f-9362-4a0755e90e50'],
  ST: ['223 - South Torrance', '6e5bf60e-9b0d-40ce-ae9e-baa997351589'],
  TO: ['213 - North Torrance', '6023b2ee-cbfb-4ac3-8163-f2a30bfd5973'],
  VN: ['242 - Van Nuys', '3aeb7f3a-6524-4d8d-a0b0-34e4875a568d'],
  WC: ['224 - West Covina', '8f55b444-968c-46b5-9e73-119793350017'],
  WH: ['222 - Whittier', '56f189ab-e837-409f-9070-f15b135d357a'],
};
const GL = {
  cash: ['1072 - Cash in Bank-Change Orders', 'b4460164-be53-f111-aa98-000d3a41fbd2'],
  os: ['5910 - Cash over Short', 'e3460164-be53-f111-aa98-000d3a41fbd2'],
};
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const r2 = x => Math.round(x * 100) / 100;

const src = process.argv[2];
if (!src || !fs.existsSync(src)) stop('no file ' + src);
const wk = path.basename(src).match(/(\d{1,2})\.(\d{1,2})\s*-\s*(\d{1,2})\.(\d{1,2})/);
if (!wk) stop('file name carries no M.D-M.D week: ' + path.basename(src));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'co-'));
execFileSync('unzip', ['-o', '-q', src, '-d', dir]);
const rd = f => fs.readFileSync(path.join(dir, f), 'utf8');
const strs = [];
for (const m of rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
  let t = ''; for (const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) t += n[1];
  strs.push(t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
}
const book = rd('xl/workbook.xml'), rels = rd('xl/_rels/workbook.xml.rels');
const sheet = name => {
  const id = (book.match(new RegExp('<sheet name="' + name + '"[^>]*r:id="([^"]+)"')) || [])[1];
  if (!id) return null;
  const rel = (rels.match(new RegExp('<Relationship[^>]*Id="' + id + '"[^>]*>')) || [''])[0];
  const tgt = rel.match(/Target="([^"]+)"/)[1].replace(/^\/?xl\//, '');
  const c = {};
  for (const m of rd('xl/' + tgt).matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const t = (m[2].match(/t="([^"]+)"/) || [])[1], v = ((m[3] || '').match(/<v>([\s\S]*?)<\/v>/) || [])[1];
    if (v !== undefined) c[m[1]] = t === 's' ? strs[+v] : v;
  }
  return c;
};

// year from Control!B3, the period start as an Excel serial
const ctl = sheet('Control');
if (!ctl || !/^\d+$/.test(ctl.B3 || '')) stop('Control!B3 carries no period start date');
const year = new Date(Date.UTC(1899, 11, 30) + ctl.B3 * 864e5).getUTCFullYear();
const sun = new Date(Date.UTC(year, wk[1] - 1, +wk[2])), sat = new Date(Date.UTC(year, wk[3] - 1, +wk[4]));
if (sun.getUTCDay() !== 0 || sat.getUTCDay() !== 6 || (sat - sun) / 864e5 !== 6) stop('file week ' + wk[0] + ' is not Sunday through Saturday of ' + year);
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
  const x = new Date(sun.getTime() + i * 864e5), m = x.getUTCMonth() + 1, dd = x.getUTCDate();
  return { label: d + ' ' + m + '-' + dd, comment: m + '.' + dd };
});

const num = (v, where) => {
  const s = String(v === undefined ? '' : v).trim();
  if (s === '') return 0;
  if (!/^-?\d+(\.\d+)?(E-?\d+)?$/i.test(s)) stop(where + ' reads "' + s + '", not a number');
  return r2(+s);
};

const lines = [], stores = [];
for (const tab of Object.keys(SHEETS)) {
  const c = sheet(tab);
  if (!c) stop('workbook has no ' + tab + ' tab');
  const byLabel = {};
  for (const a in c) if (/^B\d+$/.test(a)) byLabel[String(c[a]).trim()] = +a.slice(1);
  const rows = days.map(d => byLabel[d.label]);
  const miss = rows.findIndex(r => !r);
  if (miss >= 0) stop(tab + ' lacks a row labeled ' + days[miss].label);
  if (rows.some((r, i) => i && r !== rows[i - 1] + 1)) stop(tab + ' week rows are not consecutive');
  const amts = rows.map((r, i) => num(c['C' + r], tab + '!C' + r + ' (' + days[i].label + ')'));
  const sum = r2(amts.reduce((s, x) => s + x, 0)), tot = rows[6] + 1;
  if (/total week/i.test(c['B' + tot] || '') && c['C' + tot] !== undefined && Math.abs(num(c['C' + tot], tab + '!C' + tot) - sum) > 0.004)
    stop(tab + ' Total Week C' + tot + ' reads ' + c['C' + tot] + ', the days sum to ' + sum);
  const nz = amts.filter(x => x);
  if (!nz.length) continue;
  if (nz.some(x => x > 0) && nz.some(x => x < 0)) stop(tab + ' mixes positive and negative deposits in one week: ' + nz.join(', '));
  const [loc, locId] = SHEETS[tab], total = Math.abs(sum);
  lines.push({ side: 'debit', gl: GL.os[0], glId: GL.os[1], loc, locId, amount: total, comment: '' });
  amts.forEach((x, i) => { if (x) lines.push({ side: 'credit', gl: GL.cash[0], glId: GL.cash[1], loc, locId, amount: Math.abs(x), comment: days[i].comment }); });
  stores.push({ tab, loc, total, days: amts.map((x, i) => x ? days[i].comment + '=' + Math.abs(x) : null).filter(Boolean) });
}
fs.rmSync(dir, { recursive: true, force: true });
if (!lines.length) stop('no store carries a change order deposit this week');

console.log(JSON.stringify({
  date: (sat.getUTCMonth() + 1) + '/' + sat.getUTCDate() + '/' + year,
  number: 'Change Orders ' + wk[1] + '-' + wk[2] + ' through ' + wk[3] + '-' + wk[4] + '-' + String(year).slice(2),
  total: r2(stores.reduce((s, x) => s + x.total, 0)),
  stores, lines,
}, null, 1));

// Plan the workbook ops for a date range from the GL lines, replaying them against one tab.
// usage: node plan.js <dump.txt from xlsx-dump> <tab> <glrows.json> <entries.json> <M/D/YYYY start> <M/D/YYYY end>
// prints, per day: the ops, every line it could not match (ISSUE), and the tab totals against the GL.
// writes ops-<M>-<D>.json per day in the working dir.
const fs = require('fs');
const [dumpF, tab, glF, entF, fromS, toS] = process.argv.slice(2);
const day = s => { const d = new Date(s); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const md = d => (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
const n = s => +String(s).replace(/,/g, '');
const xl = v => /^\d{5}(\.\d+)?$/.test(v) ? new Date(Date.UTC(1899, 11, 30) + Math.round(+v) * 864e5) : null;
const ymd = d => d ? (d.getUTCMonth ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : d) : null;

// tab state
const dump = fs.readFileSync(dumpF, 'utf8').split('\n');
const start = dump.findIndex(l => l === '===== ' + tab); if (start < 0) throw 'no tab ' + tab;
const cells = {};
for (let i = start + 1; i < dump.length && !dump[i].startsWith('====='); i++)
  for (const m of dump[i].matchAll(/([A-Z]+)(\d+)="((?:[^"\\]|\\.)*)"/g)) cells[m[1] + m[2]] = JSON.parse('"' + m[3] + '"');
const dep = [], rec = [];
for (let r = 5; r < 400; r++) {
  if (cells['C' + r] === 'Total') break;
  if ((cells['C' + r] || '').trim()) dep.push({ ev: cells['B' + r], name: cells['C' + r].trim(), amt: n(cells['D' + r] || 0), clr: !!cells['E' + r] });
  if ((cells['H' + r] || '').trim()) rec.push({ ev: cells['G' + r], name: cells['H' + r].trim(), amt: n(cells['I' + r] || 0) || 0, clr: !!(cells['J' + r] || '').trim() });
}
const open = L => L.filter(x => !x.clr);
const sum = L => open(L).reduce((a, x) => a + x.amt, 0);

const STOP = new Set(['wedding', 'dinner', 'party', 'reception', 'ceremony', 'rehearsal', 'welcome', 'and', 'the', 'tip', 'balance', 'afterparty', 'event', 'events', 'birthday', 'bday', 'baby', 'shower', 'celebration', 'lunch', 'with']);
const toks = s => new Set(String(s).toLowerCase().replace(/[^a-z0-9& ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
const overlap = (a, b) => { const B = toks(b); let k = 0; for (const w of toks(a)) if (B.has(w)) k++; return k; };
const eventName = num => num.replace(/^Events\s*-\s*/i, '').replace(/^(CANCELLED|OPP|TASTING|PIZZA PU|PIZZA DL|PM PDR|SPDR|PDR|GD|PF|PS|PU|DL|PM)\s*:\s*/i, '').trim();

// pick one open row matching amt; prefer name overlap; else a set of same-name rows summing to amt
function take(L, amt, name, evDate) {
  const c = open(L).filter(x => Math.abs(x.amt - amt) < 0.005);
  c.sort((a, b) => overlap(b.name, name) - overlap(a.name, name));
  if (c.length && overlap(c[0].name, name) > 0) return [c[0]];
  const same = open(L).filter(x => overlap(x.name, name) > 0);
  for (let k = 2; k <= Math.min(4, same.length); k++) {
    const rec = (i, acc, s) => { if (acc.length === k) return Math.abs(s - amt) < 0.005 ? acc : null; for (let j = i; j < same.length; j++) { const r = rec(j + 1, [...acc, same[j]], s + same[j].amt); if (r) return r; } return null; };
    const r = rec(0, [], 0); if (r) return r;
  }
  return null;
}

const gl = JSON.parse(fs.readFileSync(glF, 'utf8'));
const ents = JSON.parse(fs.readFileSync(entF, 'utf8'));
const byNum = {}; const nk = s => String(s || '').replace(/\s+/g, ' ').trim();
for (const e of ents) (byNum[nk(e.num)] = byNum[nk(e.num)] || []).push(e);
const from = day(fromS), to = day(toS);
const bal = {};
for (const x of gl) { const d = day(x.date); if (d <= to) bal[x.acct.slice(0, 4) + ' ' + md(d)] = n(x.bal); }
let last = { "2015": +sum(dep).toFixed(2), "1242": +sum(rec).toFixed(2) };
for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
  const ops = [], issues = [];
  const todays = gl.filter(x => +day(x.date) === +d);
  const seen = new Set();
  for (const g of todays) {
    g.ref = g.ref.replace(/''/g, "'");
    const key = g.ref + '|' + g.type; if (seen.has(key)) continue; seen.add(key);
    const cand = (byNum[nk(g.ref)] || []).filter(e => +day(e.date) === +d);
    if (cand.length !== 1) { issues.push(`no unique entry for ${g.type} ${g.ref} (${cand.length})`); continue; }
    const e = cand[0]; const isBD = /^Bank Deposit/.test(e.name);
    const lines = e.lines.filter(l => /^(2015|1242)/.test(l.acct) && (l.dr || l.cr));
    // a JE's 2015 lines may together clear one combined deposit row
    const jeDep = [];
    for (const l of lines) {
      const a = l.acct.slice(0, 4), amt = +(l.cr - l.dr).toFixed(2);
      if (isBD) {
        const m = (l.c || '').match(/^\s*(\d{1,2}\/\d{1,2}\/\d{2,4}):?\s*(.*)$/);
        const ev = m ? md(day(m[1].replace(/\/(\d\d)$/, '/20$1'))) : 'TBD', nm = (m ? m[2] : l.c || '').trim() || `Unknown - ${e.num}`;
        if (a === '2015' && amt > 0) { const r = { ev, name: nm, amt, clr: false }; dep.push(r); ops.push({ op: 'add', side: 'dep', collected: md(d), event: ev, name: nm, amt }); if (ev === 'TBD') issues.push(`deposit with no event date: ${e.num} ${amt} "${l.c}"`); }
        else if (a === '1242' && amt > 0) {
          const hit = take(rec, amt, nm);
          const short = hit ? null : open(rec).filter(x => overlap(x.name, nm) > 0 && x.amt > amt && !/ TIP$/.test(x.name));
          if (hit) for (const h of hit) { h.clr = true; ops.push({ op: 'clr', side: 'rec', name: h.name, amt: h.amt }); }
          else if (short && short.length === 1) {
            // paid short: clear the receivable, carry what is still owed
            const h = short[0], left = +(h.amt - amt).toFixed(2); h.clr = true; ops.push({ op: 'clr', side: 'rec', name: h.name, amt: h.amt });
            const r = { ev: h.ev, name: h.name + ' - short paid', amt: left, clr: false }; rec.push(r); ops.push({ op: 'add', side: 'rec', event: md(d), name: r.name, amt: left });
            issues.push(`paid short: ${e.num} ${amt} against ${h.name} ${h.amt}, ${left} left on 1242`);
          } else { const r = { ev: md(d), name: 'UNMATCHED payment - ' + nm, amt: -amt, clr: false }; rec.push(r); ops.push({ op: 'add', side: 'rec', event: md(d), name: r.name, amt: -amt }); issues.push(`1242 payment with no receivable: ${e.num} ${amt} "${l.c}"`); }
        } else issues.push(`refund or debit on bank deposit: ${e.num} ${a} ${amt} "${l.c}"`);
      } else {
        if (a === '2015' && amt < 0) jeDep.push({ amt: -amt, c: l.c });
        else if (a === '1242' && amt < 0) { const nm = eventName(e.num) + (/tip|gratuity/i.test(l.c) ? ' TIP' : ''); rec.push({ ev: md(d), name: nm, amt: -amt, clr: false }); ops.push({ op: 'add', side: 'rec', event: md(d), name: nm, amt: -amt }); }
        else issues.push(`credit on event JE: ${e.num} ${a} ${amt} "${l.c}"`);
      }
    }
    if (jeDep.length) {
      const nm = eventName(e.num); const left = [];
      for (const j of jeDep) { const hit = take(dep, j.amt, nm); if (hit) for (const h of hit) { h.clr = true; ops.push({ op: 'clr', side: 'dep', name: h.name, amt: h.amt }); } else left.push(j); }
      if (left.length) {
        const tot = +left.reduce((s, j) => s + j.amt, 0).toFixed(2); const hit = left.length > 1 ? take(dep, tot, nm) : null;
        if (hit) for (const h of hit) { h.clr = true; ops.push({ op: 'clr', side: 'dep', name: h.name, amt: h.amt }); }
        else for (const j of left) { const r = { ev: md(d), name: 'UNMATCHED applied - ' + nm, amt: -j.amt, clr: false }; dep.push(r); ops.push({ op: 'add', side: 'dep', collected: 'TBD', event: md(d), name: r.name, amt: -j.amt }); issues.push(`2015 applied with no deposit row: ${e.num} ${j.amt} "${j.c}"`); }
      }
    }
  }
  for (const k of ['2015', '1242']) if (bal[k + ' ' + md(d)] !== undefined) last[k] = bal[k + ' ' + md(d)];
  const D = sum(dep), I = sum(rec);
  const ok = last['2015'] !== undefined && Math.abs(D - last['2015']) < 0.005 && Math.abs(I - last['1242']) < 0.005;
  if (ops.length || issues.length) {
    fs.writeFileSync(`ops-${d.getMonth() + 1}-${d.getDate()}.json`, JSON.stringify(ops));
    console.log(`== ${md(d)}  tab D ${D.toFixed(2)} I ${I.toFixed(2)} | GL 2015 ${last['2015']} 1242 ${last['1242']} ${ok ? 'TIES' : 'OFF'}`);
    for (const o of ops) console.log('  ', JSON.stringify(o));
    for (const s of issues) console.log('   ISSUE', s);
  }
}

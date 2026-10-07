// Read week.txt (Uber Earnings breakdown trees) and map each store's rows to entry lines.
// Uber signs what it keeps negative; a line's `amt` is signed debit positive.
const fs = require('fs');

const GL = {
  fees: '7380 - Uber Eats Third Party Fees', ads: '7630 - Uber Eats Marketing', offers: '4905 - Third Party App Marketing Comps',
  cb: '7535 - Third Party Refunds', tax: '2270 - Sales Tax Payable', clear: '1111 - Uber Eats Deposit Clearing',
};
const c = v => Math.round(v * 100) / 100;
const num = s => +String(s).replace(/[$,]/g, '');
const money = v => (v < 0 ? '-' : '') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// blocks: { name, uuid, pageStore, range, net, rows: [{ depth, label, amt }] }
function parseWeek(file) {
  return fs.readFileSync(file, 'utf8').split(/^== /m).slice(1).map(b => {
    const [head, ...lines] = b.replace(/\s+$/, '').split('\n');
    const p = head.split(' | ');
    // store names can hold " | ", so read the fixed fields from the right
    const net = p.pop(), range = p.pop(), i = p.findIndex(x => /^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(x));
    const rows = lines.filter(l => l.includes(' | ')).map(l => {
      const depth = l.match(/^ */)[0].length / 2, k = l.lastIndexOf(' | ');
      return { depth, label: l.slice(0, k).trim(), amt: num(l.slice(k + 3)) };
    });
    return { name: p.slice(0, i).join(' | '), uuid: p[i], pageStore: p.slice(i + 1).join(' | '), range, net: net ? num(net) : null, rows };
  });
}

// descendants, children and leaves of the row at index i, as indexes
const desc = (rows, i) => { const out = []; for (let j = i + 1; j < rows.length && rows[j].depth > rows[i].depth; j++) out.push(j); return out; };
const kids = (rows, i) => desc(rows, i).filter(j => rows[j].depth === rows[i].depth + 1);
const leaves = (rows, i) => desc(rows, i).filter(j => !(rows[j + 1] && rows[j + 1].depth > rows[j].depth));

// -> { gross, net, kept, lines: [{ gl, comment, amt, src: [] }] } or { stop }
function mapStore(b) {
  const R = b.rows, lines = [], stops = [];
  const put = (gl, comment, amt, src) => {
    if (!c(amt)) return;
    let l = lines.find(x => x.gl === gl && x.comment === comment);
    if (!l) lines.push(l = { gl, comment, amt: 0, src: [] });
    l.amt = c(l.amt + amt); l.src.push(src);
  };
  const s = r => `${r.label} ${money(r.amt)}`;
  let gross = 0, topSum = 0;
  R.forEach((r, i) => {
    if (r.depth !== 0) return;
    topSum += r.amt;
    const ch = kids(R, i).map(j => [j, R[j]]);
    if (r.label === 'Gross Sales') { gross = r.amt; return; }
    if (r.label === 'Marketing') {
      if (r.amt && !ch.length) stops.push(`Marketing ${r.amt} has no detail`);
      for (const [j, m] of ch) {
        const gl = /^Offers on items/i.test(m.label) ? [GL.offers, 'offers on items'] : /^Ad spend/i.test(m.label) ? [GL.ads, 'ad spends'] : null;
        if (!gl) { stops.push(`unmodeled marketing row "${m.label}" ${m.amt}`); continue; }
        const sub = kids(R, j).map(k => R[k]);
        if (!sub.length) { put(...gl, -m.amt, s(m)); continue; }
        for (const x of sub) {
          if (/\(excl\. (tax|VAT)\)$/.test(x.label)) put(...gl, -x.amt, s(x));
          else if (/^Tax on/i.test(x.label)) put(GL.tax, '', -x.amt, s(x));
          else stops.push(`unmodeled marketing row "${x.label}" ${x.amt}`);
        }
      }
      return;
    }
    if (r.label === 'Uber Fees') {
      for (const [j, m] of ch) {
        if (m.label !== 'Net Marketplace Fee (incl. tax)') { stops.push(`unmodeled fee row "${m.label}" ${m.amt}`); continue; }
        const taxed = desc(R, j).map(k => R[k]).find(x => /tax/i.test(x.label) && !/\(excl\. tax\)$/.test(x.label));
        if (taxed) stops.push(`tax on Uber fees "${taxed.label}" ${taxed.amt}`);
        put(GL.fees, 'marketplace fees', -m.amt, s(m));
      }
      if (c(r.amt - ch.reduce((t, [, m]) => t + m.amt, 0))) stops.push(`Uber Fees ${r.amt} is not the sum of its rows`);
      return;
    }
    if (r.label === 'Amendments') {
      for (const [j, m] of ch) {
        if (m.label === 'Net Chargeback Amount (incl. tax)') {
          // leaves: chargebacks excl. tax and the tax on them
          const lv = leaves(R, j).map(k => R[k]);
          for (const x of lv) {
            if (/^Chargebacks \(excl\. tax\)$/.test(x.label)) put(GL.cb, 'net chargeback', -x.amt, s(x));
            else if (/^Tax on chargebacks$/i.test(x.label)) put(GL.tax, '', -x.amt, s(x));
            else stops.push(`unmodeled chargeback row "${x.label}" ${x.amt}`);
          }
          if (c(m.amt - lv.reduce((t, x) => t + x.amt, 0))) stops.push(`${m.label} ${m.amt} is not the sum of its rows`);
        } else if (m.label === 'Marketplace Facilitator Tax') put(GL.tax, '', -m.amt, s(m));
        else if (m.label === 'Income tax deduction') put(GL.tax, 'backup withholding', -m.amt, `Backup withholding: ${s(m)}`);
        else if (m.label === 'Other payments') {
          for (const k of kids(R, j)) {
            const x = R[k];
            if (x.label === 'Backup Withholding Reimbursement') put(GL.tax, 'backup withholding reimbursement', -x.amt, s(x));
            else stops.push(`unmodeled other payment "${x.label}" ${x.amt}`);
          }
        } else stops.push(`unmodeled amendment "${m.label}" ${m.amt}`);
      }
      if (c(r.amt - ch.reduce((t, [, m]) => t + m.amt, 0))) stops.push(`Amendments ${r.amt} is not the sum of its rows`);
      return;
    }
    stops.push(`unmodeled row "${r.label}" ${r.amt}`);
  });
  const net = b.net === null ? c(topSum) : b.net;
  if (R.length && Math.abs(c(topSum) - net) > 0.005) stops.push(`breakdown adds to ${c(topSum)}, Net sales ${net}`);
  const kept = c(gross - net), dr = c(lines.reduce((t, l) => t + l.amt, 0));
  if (Math.abs(dr - kept) > 0.005) stops.push(`lines ${dr} != Gross Sales ${gross} less Net sales ${net}`);
  if (dr) put(GL.clear, '', -dr, `Gross Sales ${money(gross)} less Net sales ${money(net)}`);
  return stops.length ? { stop: stops.join('; ') } : { gross, net, kept, lines };
}

module.exports = { GL, c, money, parseWeek, mapStore };

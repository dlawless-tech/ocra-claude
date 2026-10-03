// Read the unzipped DoorDash financial report: CSV parsing and the money columns the entry uses.
const fs = require('fs'), path = require('path');

function parse(t) {
  const rows = []; let r = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++ } else q = false } else f += ch }
    else if (ch === '"') q = true; else if (ch === ',') { r.push(f); f = '' }
    else if (ch === '\n') { r.push(f.replace(/\r$/, '')); rows.push(r); r = []; f = '' } else f += ch }
  if (f || r.length) { r.push(f); rows.push(r) }
  const h = rows[0].map(k => k.replace(/^﻿/, ''));
  return rows.slice(1).filter(r => r.length >= h.length - 1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}

const read = (dir, prefix) => {
  const fn = fs.readdirSync(dir).find(f => f.startsWith(prefix));
  if (!fn) throw new Error(`no ${prefix}* in ${dir}`);
  return parse(fs.readFileSync(path.join(dir, fn), 'utf8'));
};

const COLS = {
  sub: 'Subtotal', taxm: 'Subtotal tax passed to merchant', comm: 'Commission', ppf: 'Payment processing fee',
  mktf: 'Marketing fees | (including any applicable taxes)', dYou: 'Customer discounts from marketing | (funded by you)',
  dDD: 'Customer discounts from marketing | (funded by DoorDash)', d3: 'Customer discounts from marketing | (funded by a third-party)',
  ddc: 'DoorDash marketing credit', tpc: 'Third-party contribution', err: 'Error charges', adj: 'Adjustments', net: 'Net total',
};

module.exports = { parse, read, COLS };

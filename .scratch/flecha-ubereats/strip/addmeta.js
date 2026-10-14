// add total and stores, which check-lines.js prints
const f = process.argv[2], w = require(require('path').resolve(f)), c = v => Math.round(v * 100) / 100;
w.total = c(w.lines.filter(l => l.side === 'debit').reduce((a, l) => a + l.amount, 0));
const by = {}; for (const l of w.lines) by[l.loc] = c((by[l.loc] || 0) + (l.side === 'debit' ? l.amount : 0));
w.stores = Object.keys(by).map(loc => ({ loc, total: by[loc], days: [] }));
require('fs').writeFileSync(f, JSON.stringify(w, null, 1));

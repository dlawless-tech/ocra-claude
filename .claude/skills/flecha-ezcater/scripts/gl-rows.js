// Parse gl.sh output into rows. kind: sales (Daily Sales Summary JE000...), deposit, fee (3rd Party entries), other.
const fs = require('fs');
const num = s => +s.replace(/,/g, '').replace(/^\((.*)\)$/, '-$1');
const day = s => { const [m, d, y] = s.split('/').map(Number); return new Date(y, m - 1, d); };
const sunday = s => { const D = day(s); D.setDate(D.getDate() + (7 - D.getDay()) % 7); return `${D.getMonth() + 1}/${D.getDate()}/${D.getFullYear()}`; };
const rows = f => fs.readFileSync(f, 'utf8').trim().split('\n').filter(l => /^\d+\/\d+\/\d{4}\|/.test(l)).map(l => {
  const p = l.split('|'), [date, type, number, loc] = p;
  const comment = p.length > 7 ? p.slice(4, -3).join('|') : '';
  const [dr, cr] = p.slice(-3, -1).map(num);
  const kind = type === 'Journal Entry' && /^JE000/.test(number) ? 'sales' : type === 'Bank Deposit' ? 'deposit' : /^3rd Party/.test(number) ? 'fee' : 'other';
  return { date, type, number, loc, comment, dr, cr, kind };
});
// store opening balances from a BYLOC=1 pull: { 'Flecha HB': 1299.24, ... }
const begBalances = f => { const out = {}; let store = null;
  for (const l of fs.readFileSync(f, 'utf8').trim().split('\n')) {
    if (/^(Flecha [A-Za-z0-9 ]+|Corporate)$/.test(l)) store = l;
    else if (store && /\|Beg Balance:\|/.test(l)) out[store] = num(l.split('|').pop());
  } return out; };
module.exports = { rows, begBalances, day, sunday, num };

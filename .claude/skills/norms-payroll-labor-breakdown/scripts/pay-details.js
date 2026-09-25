// Read the ADP PAY DETAILS LG csv into hourly labor per store, split FOH / BOH.
// Shared by build-split.js here and norms-payroll's build-plan.js.
const fs = require('fs');

const KEY = {
  '4085': 'BOH', '5245': 'BOH', '5250': 'BOH', '5251': 'BOH', '5255': 'BOH', '5260': 'BOH', '5800': 'BOH',
  '5265': 'FOH', '5270': 'FOH', '5275': 'FOH', '5280': 'FOH', '5285': 'FOH', '6020': 'FOH',
  '5215': 'SAL', '5220': 'SAL', '5230': 'SAL',
};
const HOURLY_COLS = ['Regular Earnings Total', 'Overtime Earnings Total', 'Double Time Earnings', 'MEAL PENALTY ERNS'];
// stores whose hourly and salary labor all sit on one 6025 line
const ALL_LABOR_6025 = new Set(['370']);
const FOH = '5241', BOH = '5242';
const r2 = x => Math.round(x * 100) / 100;

// returns { '<loc>': { FOH, BOH, SAL } }; throws on a job GL with money and no key entry
function loadPayDetails(csvPath) {
  const rows = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/).map(l => l.split(','));
  const head = rows.shift();
  const cols = HOURLY_COLS.map(c => head.indexOf(c));
  if (cols.includes(-1)) throw new Error('pay details missing column ' + HOURLY_COLS[cols.indexOf(-1)]);
  const by = {}, unknown = [];
  for (const r of rows) {
    // excel stores col B as a number: 222.5250 arrives as 222.525
    const [loc, raw = ''] = r[1].split('.');
    const gl = raw.padEnd(4, '0');
    const amt = cols.reduce((s, i) => s + (+r[i] || 0), 0);
    const side = KEY[gl];
    if (!side) { if (Math.abs(amt) >= 0.005) unknown.push(`${r[1]} = ${r2(amt)}`); continue; }
    by[loc] = by[loc] || { FOH: 0, BOH: 0, SAL: 0 };
    by[loc][side] += amt;
  }
  if (unknown.length) throw new Error('job GLs missing from the key, with money on them:\n  ' + unknown.join('\n  '));
  for (const v of Object.values(by)) for (const k of Object.keys(v)) v[k] = r2(v[k]);
  return by;
}

module.exports = { loadPayDetails, ALL_LABOR_6025, FOH, BOH, r2 };

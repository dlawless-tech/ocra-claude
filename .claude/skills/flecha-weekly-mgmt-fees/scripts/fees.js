// usage: node fees.js <report.txt>
// Reads Total Net Sales from a saved Weekly Mgmt Fee report snapshot, prints fees.json.
const fs = require('fs');
const txt = fs.readFileSync(process.argv[2], 'utf8');

const week = (txt.match(/Week Ending (\d\d\/\d\d\/\d{4})/) || [])[1];
if (!week) { console.error('FAIL: no "Week Ending" header'); process.exit(1); }

const tokens = [...txt.matchAll(/(cell|link) "([^"]*)"/g)].map(m => ({ kind: m[1], text: m[2] }));
const cols = ['Flecha 4S Ranch', 'Flecha HB', 'Flecha NB', 'Flecha Town Square', 'Total'];
const at = tokens.findIndex(t => t.kind === 'cell' && t.text === cols[0]);
if (at < 0 || cols.some((c, i) => tokens[at + i].text !== c)) {
  console.error('FAIL: location headers are not ' + cols.join(', '));
  process.exit(1);
}

const row = tokens.findIndex(t => t.kind === 'cell' && t.text === 'Total Net Sales');
const nums = [];
for (let i = row + 1; i < tokens.length && nums.length < 5; i++) {
  if (tokens[i].kind === 'link') nums.push(Number(tokens[i].text.replace(/,/g, '')));
  else if (/^[A-Z]/.test(tokens[i].text)) break;
}
if (row < 0 || nums.length !== 5 || nums.some(isNaN)) { console.error('FAIL: Total Net Sales row unreadable'); process.exit(1); }

// report name -> JE location
const loc = {
  'Flecha 4S Ranch': '103 - Flecha 4S Ranch',
  'Flecha HB': '101 - Flecha HB',
  'Flecha NB': '104 - Flecha NB',
  'Flecha Town Square': '102 - Flecha Town Square',
};
const stores = cols.slice(0, 4).map((c, i) => ({
  store: c, location: loc[c], netSales: nums[i], fee: Math.round(nums[i] * 7) / 100,
}));
const storeSum = Math.round(stores.reduce((s, x) => s + x.netSales * 100, 0));
if (storeSum !== Math.round(nums[4] * 100)) { console.error('FAIL: stores do not sum to Total'); process.exit(1); }

const entryAmount = Math.round(stores.reduce((s, x) => s + x.fee * 100, 0)) / 100;
console.log(JSON.stringify({ weekEnding: week, totalNetSales: nums[4], entryAmount, stores }, null, 2));

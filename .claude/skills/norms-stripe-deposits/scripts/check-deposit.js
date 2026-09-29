// Compare a saved deposit's read-back against its plan.
// Usage: node check-deposit.js <plan.json> <readback.json> <export file name>
// Prints MATCH, or one line per difference.
const fs = require('fs');
const [planPath, backPath, file] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const back = JSON.parse(fs.readFileSync(backPath, 'utf8'));
const key = l => `${l.account}|${Math.round(l.amount * 100)}|${l.location}|${String(l.comment).trim()}`;
const bad = [];
if (back.date !== plan.depositDate) bad.push(`date ${back.date}, plan ${plan.depositDate}`);
if (back.status !== 'Approved') bad.push(`status ${back.status}`);
if (!back.attachments.includes(file)) bad.push(`no attachment ${file}`);
const want = plan.lines.map(key).sort(), got = back.lines.map(key).sort();
want.filter(k => !got.includes(k)).forEach(k => bad.push('missing ' + k));
got.filter(k => !want.includes(k)).forEach(k => bad.push('extra ' + k));
if (want.length !== got.length) bad.push(`lines ${got.length}, plan ${want.length}`);
console.log(bad.length ? bad.join('\n') : `MATCH ${back.title} ${plan.total.toFixed(2)}`);
process.exit(bad.length ? 1 : 0);

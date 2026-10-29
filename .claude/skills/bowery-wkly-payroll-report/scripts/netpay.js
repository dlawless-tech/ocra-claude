// Pull the week's Net Pay and Cash Requirements reports from Paycor into the Payroll folder, named the way bowery-payroll reads them.
// usage: node netpay.js <work dir> <drop folder> <M/D/YYYY week ending>
// prints one JSON result; exit 0 saved or already there, 1 problem
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [work, drop, we] = process.argv.slice(2);
const S = '-s=bnp';
const STORES = { 155090: 'Cookshop', 155030: "Rosie's", 154921: 'Shuka', 155093: 'Shukette', 154922: "Vic's", 155050: 'Bowery Group' };
const PDFTOTEXT = 'C:\\Program Files\\Git\\mingw64\\bin\\pdftotext.exe';
const [m, d, y] = we.split('/');
const md = `${+m}.${+d}`;
const weFull = `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
const REPORTS = [
  { key: 'netPay', name: 'Net Pay Report', title: /NET PAY REPORT/, end: /Period Ending\s*:\s*(\d\d\/\d\d\/\d{4})/ },
  { key: 'cashReq', name: 'Cash Requirements Report', title: /CASH REQUIREMENT/, end: /Period Ending\s*:\s*(\d\d\/\d\d\/\d{4})/ },
];

fs.mkdirSync(work, { recursive: true });
process.chdir(work);
const pw = (...a) => execFileSync('playwright-cli.cmd', [S, '--raw', ...a], { encoding: 'utf8', maxBuffer: 64 << 20, shell: true });
const runCode = file => {
  const raw = pw('run-code', `--filename=${file}`).split('\n').filter(l => !/[═║]/.test(l)).join('\n').trim();
  if (/^### Error/m.test(raw)) throw new Error(raw.slice(0, 400));
  const v = JSON.parse(raw);
  return typeof v === 'string' ? JSON.parse(v) : v;
};
const done = (status, extra) => { console.log(JSON.stringify({ status, weekEnding: weFull, ...extra })); process.exitCode = status === 'problem' ? 1 : 0; };

try {
  const creds = fs.readFileSync(path.join(process.env.USERPROFILE, '.claude', 'bowery-credentials.md'), 'utf8').split('## Paycor')[1] || '';
  const user = (creds.match(/Username:\s*(\S+)/) || [])[1], pass = (creds.match(/Password:\s*(\S+)/) || [])[1];
  if (!user || !pass) throw new Error('no Paycor login under ## Paycor in ~/.claude/bowery-credentials.md');

  try { pw('close'); } catch {}
  pw('open', '--headed', 'https://hcm.paycor.com/authentication/signin');
  const login = path.join(work, 'login.tmp.js');
  fs.writeFileSync(login, `async page => {
    await page.waitForTimeout(4000);
    const ok = page.getByRole('button', { name: 'Accept All Cookies' });
    if (await ok.isVisible().catch(() => false)) await ok.click();
    await page.locator('#Username').fill(${JSON.stringify(user)});
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.locator('#password').fill(${JSON.stringify(pass)}, { timeout: 30000 });
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForURL(/\\/Portal/i, { timeout: 60000 }).catch(() => {});
    return JSON.stringify(page.url());
  }`);
  let at;
  try { at = runCode(login); } finally { fs.rmSync(login, { force: true }); }
  if (!/\/Portal/i.test(at)) throw new Error(`Paycor sign-in did not reach the home page, stopped at ${at}`);

  const runs = runCode(path.join(__dirname, 'walk.js'));
  const problems = [], files = [];
  for (const r of runs) {
    r.store = STORES[r.co];
    r.kind = /SALARY/i.test(r.run) ? 'Salary' : 'Hourly';
    for (const rep of REPORTS) {
      if (r.kind === 'Hourly' && r.co !== '155050' && !r[rep.key]) problems.push(`${r.store} hourly run ${r.run} has no ${rep.name}`);
      if (r[rep.key] && !r[rep.key + 'Pdf']) problems.push(`${r.store} ${r.run}: ${rep.name} listed but the PDF did not load`);
    }
  }
  for (const co of Object.keys(STORES)) if (!runs.some(r => r.co === co)) problems.push(`${STORES[co]}: no payroll runs found`);
  for (const rep of REPORTS) for (const r of runs.filter(r => r[rep.key + 'Pdf'])) {
    const both = runs.filter(x => x.co === r.co && x[rep.key + 'Pdf']).length > 1;
    const name = `${md} ${r.store} ${both ? r.kind + ' ' : ''}${rep.name}.pdf`;
    if (files.some(f => f.name === name)) { problems.push(`two runs would both save as ${name}`); continue; }
    const tmp = path.join(work, `${rep.key}-${r.co}-${r.kind}.pdf`);
    fs.writeFileSync(tmp, Buffer.from(r[rep.key + 'Pdf'], 'base64'));
    const text = execFileSync(PDFTOTEXT, ['-layout', tmp, '-'], { encoding: 'utf8' });
    fs.writeFileSync(tmp.replace(/pdf$/, 'txt'), text);
    // a stale frame once saved the 401K Report as Cookshop's Net Pay
    if (!rep.title.test(text)) { problems.push(`${r.store} ${r.kind} ${rep.name}: the PDF Paycor served is a different report`); continue; }
    const end = (text.match(rep.end) || [])[1];
    if (end !== weFull) problems.push(`${r.store} ${r.kind} ${rep.name}: Paycor's current payroll ends ${end || '?'}, not ${weFull}`);
    files.push({ name, tmp, store: r.store, kind: r.kind, run: r.run });
  }
  if (problems.length) return done('problem', { problems, runs: runs.map(({ netPayPdf, cashReqPdf, ...r }) => r) });

  const saved = [], kept = [];
  for (const f of files) {
    const to = path.join(drop, f.name);
    if (fs.existsSync(to)) { kept.push(f.name); continue; }
    fs.copyFileSync(f.tmp, to);
    saved.push(f.name);
  }
  done('saved', { saved, kept, files: files.map(({ tmp, ...f }) => f), noNetPay: runs.filter(r => !r.netPay).map(r => `${r.store} ${r.kind}`), noCashReq: runs.filter(r => !r.cashReq).map(r => `${r.store} ${r.kind}`) });
} catch (e) {
  done('problem', { problems: [String(e.message || e).slice(0, 600)] });
} finally {
  try { pw('close'); } catch {}
}

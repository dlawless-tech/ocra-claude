// Download the week's payroll journal from 7shifts Payroll into the Payroll folder, the import file for danny-coops-payroll.
// usage: node journal.js <work dir> <drop folder> <M/D/YYYY week ending>
// prints one JSON result; exit 0 saved, already there, or not ready yet; 1 problem
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [work, drop, we] = process.argv.slice(2);
const S = '-s=dcpr';
const PROFILE = path.join(process.env.USERPROFILE, '.claude', 'playwright-profiles', 'danny-coops-7shifts');
const [m, d, y] = we.split('/');
const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const label = `${MON[m - 1]} ${+d}, ${y}`;

fs.mkdirSync(work, { recursive: true });
process.chdir(work);
const pw = (...a) => execFileSync('playwright-cli.cmd', [S, '--raw', ...a], { encoding: 'utf8', maxBuffer: 64 << 20, shell: true });
const runCode = (name, body) => {
  const file = path.join(work, name);
  fs.writeFileSync(file, body);
  try {
    // run-code exits 1 on a page error; the error text is on stdout
    let out;
    try { out = pw('run-code', `--filename=${file}`); } catch (e) { out = String(e.stdout || e.message); }
    const raw = out.split('\n').filter(l => !/[═║]/.test(l)).join('\n').trim();
    if (/^### Error/m.test(raw)) throw new Error(raw.slice(0, 400));
    const v = JSON.parse(raw);
    return typeof v === 'string' ? JSON.parse(v) : v;
  } finally { fs.rmSync(file, { force: true }); }
};
const done = (status, extra) => { console.log(JSON.stringify({ status, weekEnding: we, ...extra })); process.exitCode = status === 'problem' ? 1 : 0; };
const periodEnds = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).slice(1).map(l => l.split(',')[3]).filter(Boolean);
const journals = dir => fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => /payroll-journal.*\.csv$/i.test(n)).map(n => path.join(dir, n)) : [];

// text code: tag Tricia, then wait for it typed in the open window or dropped in code.txt
const CODE_WAIT_MIN = 45;
const waitForCode = async () => {
  const codeFile = path.join(work, 'code.txt');
  fs.rmSync(codeFile, { force: true });
  runCode('trust.tmp.js', `async page => {
    const t = page.getByRole('checkbox', { name: /Trust this device/ });
    if (await t.count() && !(await t.isChecked())) await t.check();
    return '""';
  }`);
  const until = new Date(Date.now() + CODE_WAIT_MIN * 60000);
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'notify-teams.ps1'),
    '-Title', `Danny & Coops 7shifts: text code needed, W.E. ${we}`,
    '-Lines', `7shifts texted a 6-digit code to the phone ending 8077.`,
    `Type it into the open 7shifts window on Tricia's PC, or save just the 6 digits in ${codeFile}.`,
    `Waiting until ${until.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}; the device is then trusted for 45 days.`], { stdio: 'ignore' });
  console.error(`waiting for 7shifts text code: window or ${codeFile}`);
  let url = '';
  while (Date.now() < until) {
    await new Promise(r => setTimeout(r, 15000));
    const code = fs.existsSync(codeFile) ? fs.readFileSync(codeFile, 'utf8').replace(/\D/g, '') : '';
    if (code.length === 6) {
      fs.rmSync(codeFile, { force: true });
      url = runCode('code.tmp.js', `async page => {
        const t = page.getByRole('checkbox', { name: /Trust this device/ });
        if (await t.count() && !(await t.isChecked())) await t.check();
        await page.getByRole('textbox', { name: 'Verification code' }).fill(${JSON.stringify(code)});
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.waitForURL(/app\\.7shifts\\.com/, { timeout: 30000 }).catch(() => {});
        return JSON.stringify(page.url());
      }`);
    } else url = runCode('url.tmp.js', `async page => JSON.stringify(page.url())`);
    if (/app\.7shifts\.com/.test(url)) break;
  }
  if (!/app\.7shifts\.com/.test(url)) throw new Error(`7shifts asked for a text code and none was entered within ${CODE_WAIT_MIN} minutes.`);
  return runCode('payroll.tmp.js', `async page => {
    if (!/\\/payroll/.test(page.url())) await page.goto('https://app.7shifts.com/payroll');
    await page.waitForTimeout(5000);
    return JSON.stringify(page.url());
  }`);
};

(async () => {
try {
  const have = [...journals(drop), ...journals(path.join(drop, 'Completed'))].find(f => periodEnds(f).includes(iso));
  if (have) return done('kept', { file: have });

  const creds = fs.readFileSync(path.join(process.env.USERPROFILE, '.claude', 'danny-coops-credentials.md'), 'utf8').split('## 7shifts')[1] || '';
  const user = (creds.match(/Username:\s*(\S+)/) || [])[1], pass = (creds.match(/Password:\s*(\S+)/) || [])[1];
  if (!user || !pass) throw new Error('no 7shifts login under ## 7shifts in ~/.claude/danny-coops-credentials.md');

  try { pw('close'); } catch {}
  pw('open', '--headed', `--profile=${PROFILE}`, 'https://app.7shifts.com/payroll');
  // trusted-device cookie in the profile skips the text code
  let at = runCode('login.tmp.js', `async page => {
    await page.waitForTimeout(8000);
    if (/login\\.7shifts\\.com/.test(page.url()) && await page.getByRole('textbox', { name: 'Password' }).isVisible().catch(() => false)) {
      await page.getByRole('textbox', { name: 'Email' }).fill(${JSON.stringify(user)});
      await page.getByRole('textbox', { name: 'Password' }).fill(${JSON.stringify(pass)});
      await page.getByRole('button', { name: 'Log In' }).click();
      await page.waitForURL(/app\\.7shifts\\.com|two-factor/, { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }
    if (!/app\\.7shifts\\.com\\/payroll/.test(page.url()) && /app\\.7shifts\\.com/.test(page.url())) { await page.goto('https://app.7shifts.com/payroll'); }
    return JSON.stringify(page.url());
  }`);
  if (/two-factor/.test(at)) at = await waitForCode();
  if (!/app\.7shifts\.com/.test(at)) throw new Error(`7shifts sign-in did not reach the app, stopped at ${at}`);

  const csv = path.join(work, 'payroll-journal.csv');
  fs.rmSync(csv, { force: true });
  const top = runCode('history.tmp.js', `async page => {
    const table = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Pay Period' }) });
    const top = table.getByRole('row').nth(1);
    await top.waitFor({ timeout: 30000 });
    const cells = (await top.getByRole('cell').allInnerTexts()).map(c => c.trim());
    const out = { period: cells[0], type: cells[1], status: cells[2], payday: cells[3] };
    if (!out.period.endsWith(${JSON.stringify(label)}) || /draft/i.test(out.status)) return JSON.stringify(out);
    await top.getByRole('button').click();
    const dl = page.waitForEvent('download', { timeout: 60000 });
    await page.getByRole('menuitem', { name: 'Download payroll journal (CSV)' }).click();
    const file = await dl;
    await file.saveAs(${JSON.stringify(csv)});
    out.suggested = file.suggestedFilename();
    return JSON.stringify(out);
  }`);
  if (!top.suggested) return done('not ready', { top });

  const ends = [...new Set(periodEnds(csv))];
  if (ends.length !== 1 || ends[0] !== iso) throw new Error(`the downloaded journal covers period end ${ends.join(', ') || '?'}, not ${iso}`);
  const name = top.suggested.replace(/^payroll-journal-/, 'payroll-journal_');
  const to = path.join(drop, name);
  if (fs.existsSync(to)) throw new Error(`${name} already sits in the Payroll folder for another week`);
  fs.copyFileSync(csv, to);
  done('saved', { file: to, top });
} catch (e) {
  done('problem', { problems: [String(e.message || e).slice(0, 600)] });
} finally {
  try { pw('close'); } catch {}
}
})();

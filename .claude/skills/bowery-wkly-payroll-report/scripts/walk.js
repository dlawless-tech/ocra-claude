// playwright-cli run-code: every company's current payroll runs, each run's Net Pay Report as base64 when it has one
async page => {
  const home = 'https://secure.paycor.com/onlinereports/index.html#/CurrentReports';
  const fr = () => page.frames().find(f => /onlinereports/.test(f.url())) || page.mainFrame();
  const closeNav = async () => {
    const b = fr().getByRole('button', { name: /Main Navigation.*to close/ });
    if (await b.count()) await b.first().click();
  };
  const pick = async co => {
    await page.goto(home); await page.waitForTimeout(3000); await closeNav();
    await fr().getByRole('combobox').first().click(); await page.waitForTimeout(1000);
    await fr().getByRole('option', { name: new RegExp(' - ' + co + '$') }).click();
    await page.waitForTimeout(3000);
  };
  // a company with one run lands on that run, with no run list
  const runName = async () => ((await fr().locator('body').innerText()).match(/Client:\s*\d+\s*-\s*(.+)/) || [])[1]?.trim();
  const out = [];
  for (const co of ['155090', '155030', '154921', '155093', '154922', '155050']) {
    await pick(co);
    let runs = (await fr().locator('td a').allInnerTexts()).map(r => r.trim()).filter(Boolean);
    const single = !runs.length;
    if (single) runs = [await runName()];
    for (const run of runs) {
      if (!single) { await pick(co); await fr().getByRole('link', { name: run, exact: true }).click(); await page.waitForTimeout(3000); }
      const note = await fr().getByText(/Last scheduled payroll/).first().innerText().catch(() => '');
      await fr().getByText('Payroll Reports:', { exact: true }).locator('..').getByRole('link', { name: 'Open', exact: true }).click();
      await page.waitForURL(/\/r\/\d+/, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(3000);
      const opts = (await fr().locator('select option').allInnerTexts()).map(o => o.trim());
      let pdf = null;
      if (opts.includes('Net Pay Report')) {
        await fr().locator('select').first().selectOption({ label: 'Net Pay Report' });
        await page.waitForURL(/\/r\/\d+/, { timeout: 15000 }).catch(() => {});
        let f;
        for (let i = 0; i < 20 && !f; i++) { await page.waitForTimeout(1000); f = page.frames().find(f => /PayrollReportService\/download/.test(f.url())); }
        if (f) pdf = (await (await page.context().request.get(f.url())).body()).toString('base64');
      }
      out.push({ co, run, note, reports: opts.length, netPay: opts.includes('Net Pay Report'), pdf });
    }
  }
  return JSON.stringify(out);
}

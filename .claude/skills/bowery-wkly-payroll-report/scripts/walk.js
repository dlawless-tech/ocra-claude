// playwright-cli run-code: every company's current payroll runs, each run's Net Pay and Cash Requirements reports as base64 when it has them
async page => {
  const home = 'https://secure.paycor.com/onlinereports/index.html#/CurrentReports';
  const WANT = { netPay: /^Net Pay Report$/, cashReq: /^Cash Req/ };
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
      const r = { co, run, note, opts };
      // each pick swaps the PDF frame; wait for a download url not seen yet
      const seen = new Set(page.frames().map(f => f.url()));
      for (const [key, re] of Object.entries(WANT)) {
        const label = opts.find(o => re.test(o));
        r[key] = label || null; r[key + 'Pdf'] = null;
        if (!label) continue;
        await fr().locator('select').first().selectOption({ label });
        await page.waitForURL(/\/r\/\d+/, { timeout: 15000 }).catch(() => {});
        let f;
        for (let i = 0; i < 20 && !f; i++) { await page.waitForTimeout(1000); f = page.frames().find(f => /PayrollReportService\/download/.test(f.url()) && !seen.has(f.url())); }
        if (f) { seen.add(f.url()); r[key + 'Pdf'] = (await (await page.context().request.get(f.url())).body()).toString('base64'); }
      }
      out.push(r);
    }
  }
  return JSON.stringify(out);
}

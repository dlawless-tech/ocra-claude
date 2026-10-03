async page => {
  const sel = await page.evaluate(() => {
    for (const e of document.querySelectorAll('body *')) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') e.style.opacity = '0'; }
    // floating chat and review widgets
    for (const t of document.querySelectorAll("body *")) if (t.childElementCount === 0 && /^(Chat with AI Assistant|Reviews)$/.test((t.innerText || "").trim())) {
      let p = t; while (p && p !== document.body && !/absolute|fixed/.test(getComputedStyle(p).position)) p = p.parentElement;
      if (p && p !== document.body) p.style.opacity = "0"; }
    document.querySelectorAll("[class*=urate]").forEach(e => e.style.opacity = "0");
    const nav = document.querySelector('[data-testid=side-nav-container]'); if (nav) nav.style.opacity = '0';
    const store = [...document.querySelectorAll('button')].find(b => /^FARE/.test(b.innerText.trim()));
    let p = document.querySelector('ul[role=tree]');
    while (p && !(p.contains(store) && /Net taxes are/.test(p.innerText))) p = p.parentElement;
    if (!p) return '';
    // breakdown card only, header to the tax note
    const kids = [...p.children]; const last = kids.findIndex(k => /Net taxes are/.test(k.innerText));
    kids.slice(last + 1).forEach(k => k.style.display = 'none');
    p.setAttribute('data-backup', '1'); return 'ok';
  });
  if (!sel) return 'FAIL: no breakdown card';
  await page.locator('[data-backup="1"]').screenshot({ path: 'C:/Users/trici/ocra-claude/.scratch/fare-ue/wk0927/backup/Uber 2026-09-21_2026-09-27_FARE Oak Park.png' });
  return 'ok';
}

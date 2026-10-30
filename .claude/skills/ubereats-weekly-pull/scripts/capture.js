// run-code template: full-page PNG of the open pay period page to SHOTPATH; pull.sh swaps SHOTPATH.
// Returns the captured height, which pull.sh checks is past the window.
async page => {
  const h = await page.evaluate(() => {
    // <main> scrolls inside wrappers pinned to window height: release both so fullPage gets it all
    for (const e of [document.documentElement, document.body, ...document.querySelectorAll('body *')]) {
      const c = getComputedStyle(e);
      if (c.height === innerHeight + 'px' || (/(auto|scroll)/.test(c.overflowY) && e.scrollHeight > e.clientHeight + 5)) {
        e.style.height = 'auto'; e.style.maxHeight = 'none'; e.style.overflow = 'visible';
      }
    }
    // AI assistant popup + floating widgets cover the breakdown
    const a = [...document.querySelectorAll('h5')].find(x => /Chat with AI Assistant/.test(x.innerText));
    let p = a; if (a) { while (p.parentElement && (p.parentElement.innerText || '').trim().startsWith('Chat with AI Assistant')) p = p.parentElement; p.style.display = 'none'; }
    for (const e of document.querySelectorAll('body *')) { const c = getComputedStyle(e); if ((c.position === 'fixed' || c.position === 'sticky') && e.getBoundingClientRect().top > 80) e.style.display = 'none'; }
    return document.documentElement.scrollHeight;
  });
  await page.screenshot({ path: SHOTPATH, fullPage: true });
  return h;
}

// Apply grid of the open AP Payment form: one row per open approved invoice
() => {
  const t = document.querySelector('table.MuiTable-root');
  if (!t) return JSON.stringify({ err: 'no apply grid' });
  const hs = [...t.querySelectorAll('thead th')].map(h => h.innerText.trim());
  const col = n => hs.indexOf(n);
  const num = s => +String(s).replace(/[,$​\s]/g, '') || 0;
  const rows = [...t.querySelectorAll('tbody tr')].map(r => {
    const td = [...r.querySelectorAll('td')];
    const cb = td[col('Apply')]?.querySelector('input[type=checkbox]');
    return { date: td[col('Date')]?.innerText.trim(), number: td[col('Number')]?.innerText.trim(),
      remaining: num(td[col('Amt Remaining')]?.innerText),
      applied: num(td[col('Apply Amount')]?.querySelector('input')?.value ?? td[col('Apply Amount')]?.innerText),
      checked: !!cb?.checked };
  }).filter(r => r.number);
  const pager = [...document.querySelectorAll('p')].map(p => p.innerText).find(s => /\d+ - \d+ of \d+ Items/.test(s)) || '';
  const left = [...document.querySelectorAll('p')].map(p => p.innerText).find(s => /remaining$/.test(s)) || '';
  return JSON.stringify({ rows, pager, left });
}

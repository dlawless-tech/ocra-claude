() => [...document.querySelectorAll('li[role=treeitem]')].map(li => {
  const row = li.querySelector(':scope > div > [data-testid=earnings-breakdown-tree-row]');
  if (!row) return null;
  let d = 0; for (let p = li.parentElement; p; p = p.parentElement) if (p.matches && p.matches('li[role=treeitem]')) d++;
  const t = [...row.querySelectorAll('div[data-baseweb],p[data-baseweb]')].map(x => x.innerText.trim()).filter(Boolean);
  return '  '.repeat(d) + t[0] + ' | ' + t[t.length - 1];
}).filter(Boolean).join('\n')

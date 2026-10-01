async () => {
  const tree=document.querySelector('[role=tree]');
  for (let k=0;k<3;k++){ for (const it of tree.querySelectorAll('[role=treeitem][aria-expanded=false]')) { it.click(); await new Promise(r=>setTimeout(r,400)); } }
  return [...tree.querySelectorAll('[role=treeitem]')].map(it=>{ const lvl=it.getAttribute('aria-level')||''; const own=(it.firstElementChild||it).innerText.replace(/\s+/g,' '); return lvl+' '+own; }).join('\n');
}

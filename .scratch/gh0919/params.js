async () => {
  const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
  const d = seen.find(x => x.querySelector('md-dialog'));
  if (!d) return 'no dialog';
  const w = d.defaultView;
  const acs = Array.from(d.querySelectorAll('md-dialog md-autocomplete'));
  const ac = acs.find(a => (a.querySelector('input')||{}).value === '5100 - Food Cost');
  const isc = w.angular.element(ac).isolateScope();
  const o = isc.$parent.r365options;
  const items = await o.querySearch('1113');
  const it = items.find(i => /A\/R Grubhub/i.test(i.display));
  if (!it) return 'no item: ' + items.map(i=>i.display).join(';');
  isc.$parent.$apply(() => { o.selectedItem = it; o.searchText = it.display; o.selectedItemChange(it); });
  const grp = lbl => Array.from(d.querySelectorAll('md-dialog span')).find(x => x.textContent.trim() === lbl).closest('section');
  const press = (lbl, idx) => { const b = Array.from(grp(lbl).querySelectorAll('button'))[idx]; const sc = w.angular.element(b).scope(); sc.$apply(() => sc.buttonSelected(sc.valuePair, sc.param, {stopPropagation(){}, preventDefault(){}})); };
  press('Subtotal By', 1);
  const state = lbl => Array.from(grp(lbl).querySelectorAll('button')).map(b => (b.classList.contains('activeR365') ? '*' : '') + (w.angular.element(b).scope().valuePair||{}).wanted);
  const vals = Array.from(d.querySelectorAll('md-dialog input')).map(i => i.value).filter(Boolean);
  return JSON.stringify({sub: state('Subtotal By'), unap: state('Show Unapproved'), vals});
}

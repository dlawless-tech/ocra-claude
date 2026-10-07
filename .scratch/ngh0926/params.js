async () => {
  const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
  const d = seen.find(x => x.querySelector('md-dialog'));
  if (!d) return 'no dialog';
  const w = d.defaultView;
  const ac = Array.from(d.querySelectorAll('md-dialog md-autocomplete')).find(a => /^\d{4} - /.test((a.querySelector('input')||{}).value||''));
  if (!ac) return 'no acct ac: ' + Array.from(d.querySelectorAll('md-dialog input')).map(i=>i.value).join(';');
  const isc = w.angular.element(ac).isolateScope();
  const o = isc.$parent.r365options;
  const items = await o.querySearch('1113');
  const it = items.find(i => /A\/R Grubhub/i.test(i.display));
  if (!it) return 'no item';
  isc.$parent.$apply(() => { o.selectedItem = it; o.searchText = it.display; o.selectedItemChange(it); });
  const grp = lbl => Array.from(d.querySelectorAll('md-dialog span')).find(x => x.textContent.trim() === lbl).closest('section');
  const b = Array.from(grp('Subtotal By').querySelectorAll('button'))[1]; const sc = w.angular.element(b).scope(); sc.$apply(() => sc.buttonSelected(sc.valuePair, sc.param, {stopPropagation(){}, preventDefault(){}}));
  await new Promise(r=>setTimeout(r,800));
  const state = lbl => Array.from(grp(lbl).querySelectorAll('button')).map(b => (b.classList.contains('activeR365') ? '*' : '') + (w.angular.element(b).scope().valuePair||{}).wanted);
  return JSON.stringify({sub: state('Subtotal By'), unap: state('Show Unapproved'), vals: Array.from(d.querySelectorAll('md-dialog input')).map(i => i.value).filter(Boolean)});
}

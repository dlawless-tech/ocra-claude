async () => {
  const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
  const d = seen.find(x => x.querySelector('md-dialog')); const w = d.defaultView;
  const el = Array.from(d.querySelectorAll('md-dialog input')).find(x => /^\d{3}-\d{2} - /.test(x.value));
  const isc = w.angular.element(el.closest('md-autocomplete')).isolateScope();
  const o = isc.$parent.r365options;
  const items = await o.querySearch('104-06');
  const it = items.find(i => /^104-06 - A\/R - Grub Hub/.test(i.display));
  if (!it) return 'no item: ' + items.map(i=>i.display).join(';');
  isc.$parent.$apply(() => { o.selectedItem = it; o.searchText = it.display; o.selectedItemChange(it); });
  const sec = Array.from(d.querySelectorAll('md-dialog span')).find(x => x.textContent.trim() === 'Subtotal By').closest('section');
  const b = Array.from(sec.querySelectorAll('button')).find(x => w.angular.element(x).scope().valuePair.display === 'Location');
  const sc = w.angular.element(b).scope();
  sc.$apply(() => sc.buttonSelected(sc.valuePair, sc.param, {stopPropagation(){}, preventDefault(){}}));
  await new Promise(r=>setTimeout(r,500));
  const state = Array.from(sec.querySelectorAll('button')).map(x => { const v=w.angular.element(x).scope().valuePair; return v.display+':'+v.wanted; });
  return JSON.stringify({acct: el.value, state, vals: Array.from(d.querySelectorAll('md-dialog input')).map(i => i.value).filter(Boolean)});
}

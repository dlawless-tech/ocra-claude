// placeholders: __Q__ first autocomplete value prefix, __T__ JSON [[label, button], ...]
async () => {
  const w = window.frames[1], d = w.document, A = w.angular;
  const ac = d.querySelector('md-dialog md-autocomplete');
  const sc = A.element(ac).isolateScope(), o = sc.$parent.r365options;
  const it = (await o.querySearch('')).concat(await o.querySearch('__Q__')).find(i => i.display.startsWith('__Q__'));
  if (!it) return 'FAIL: no option starting __Q__';
  sc.$parent.$apply(() => { o.selectedItem = it; o.searchText = it.display; o.selectedItemChange(it); });
  for (const [label, txt] of __T__) {
    const span = [...d.querySelectorAll('md-dialog span')].find(x => x.textContent.trim() === label);
    if (!span) return 'FAIL: no param ' + label;
    const b = [...span.closest('section').querySelectorAll('button')].find(b => b.textContent.trim() === txt);
    const s = A.element(b).scope();
    // buttonSelected toggles, so call it only when the button is not already wanted
    if (!s.valuePair.wanted) s.$apply(() => s.buttonSelected(s.valuePair, s.param, { stopPropagation() {}, preventDefault() {} }));
  }
  return 'ok';
}

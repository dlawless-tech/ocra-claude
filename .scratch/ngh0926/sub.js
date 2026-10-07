async () => {
  const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
  const d = seen.find(x => x.querySelector('md-dialog')); const w = d.defaultView;
  const grp = lbl => Array.from(d.querySelectorAll('md-dialog span')).find(x => x.textContent.trim() === lbl).closest('section');
  const bs = Array.from(grp('Subtotal By').querySelectorAll('button'));
  if (!bs[1].classList.contains('activeR365')) { const sc = w.angular.element(bs[1]).scope(); sc.$apply(() => sc.buttonSelected(sc.valuePair, sc.param, {stopPropagation(){}, preventDefault(){}})); }
  await new Promise(r=>setTimeout(r,800));
  return Array.from(grp('Subtotal By').querySelectorAll('button')).map(b => (b.classList.contains('activeR365') ? '*' : '') + w.angular.element(b).scope().valuePair.display).join(',') + ' | ' + Array.from(d.querySelectorAll('md-dialog input')).map(i => i.value).filter(Boolean).join(';');
}

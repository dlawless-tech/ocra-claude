() => {
  const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
  const d = seen.find(x => x.querySelector('md-dialog')); const w = d.defaultView;
  const grp = lbl => Array.from(d.querySelectorAll('md-dialog span')).find(x => x.textContent.trim() === lbl).closest('section');
  const state = lbl => Array.from(grp(lbl).querySelectorAll('button')).map(b => (b.classList.contains('activeR365') ? '*' : '') + (w.angular.element(b).scope().valuePair||{}).wanted);
  return JSON.stringify({sub: state('Subtotal By'), unap: state('Show Unapproved'), vals: Array.from(d.querySelectorAll('md-dialog input')).map(i => i.value).filter(Boolean)});
}

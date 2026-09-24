() => {
  const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
  const d = seen.find(x => x.querySelector('md-dialog')); const w = d.defaultView;
  const sec = Array.from(d.querySelectorAll('md-dialog span')).find(x => x.textContent.trim() === 'Subtotal By').closest('section');
  return JSON.stringify({sub: Array.from(sec.querySelectorAll('button')).map(x => { const v=w.angular.element(x).scope().valuePair; return v.display+':'+v.wanted; }), vals: Array.from(d.querySelectorAll('md-dialog input')).map(i => i.value).filter(Boolean)});
}

() => {
  const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
  const d = seen.find(x => x.querySelector('md-dialog')); if(!d) return 'no dialog';
  const b = Array.from(d.querySelectorAll('md-dialog [ng-click]')).find(x => x.getAttribute('ng-click').startsWith('runReport('));
  if(!b) return 'no run: ' + Array.from(d.querySelectorAll('md-dialog [ng-click]')).map(x=>x.getAttribute('ng-click')).join(';');
  b.click(); return 'clicked';
}

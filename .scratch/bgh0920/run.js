() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.querySelector('md-dialog'));
const b = Array.from(d.querySelectorAll('md-dialog button')).find(x=>(x.getAttribute('ng-click')||'').startsWith('runReport('));
if(!b) return 'NORUN'; b.click(); return 'clicked'; }

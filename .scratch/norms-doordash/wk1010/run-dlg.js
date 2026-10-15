() => { const seen=[]; const walk=d=>{seen.push(d); for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument) walk(f.contentDocument);}catch(e){}}}; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'no dialog';
const vals=Array.from(d.querySelectorAll('md-dialog input')).map(i=>i.value).filter(Boolean).join(';');
const b=Array.from(d.querySelectorAll('md-dialog button')).find(x=>/runReport\(/.test(x.getAttribute('ng-click')||''));
if(!b) return 'no run | '+vals; b.click(); return 'ran | '+vals; }

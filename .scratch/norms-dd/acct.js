() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'nodialog';
return Array.from(d.querySelectorAll('md-dialog md-autocomplete input')).map(x=>x.id+'='+x.value); }

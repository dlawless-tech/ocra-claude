() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'NODIALOG';
return [d.querySelector('md-dialog h2, md-dialog .md-toolbar-tools')?.innerText, Array.from(d.querySelectorAll('md-dialog input')).map(x=>({id:x.id,v:x.value,p:x.placeholder}))]; }

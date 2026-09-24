() => {
  const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
  const d = seen.find(x => x.querySelector('md-dialog')); if(!d) return 'no dialog';
  return JSON.stringify({title:(d.querySelector('md-dialog h2,md-dialog .md-toolbar-tools')||{}).innerText, inputs:Array.from(d.querySelectorAll('md-dialog input')).map(i=>({id:i.id,v:i.value,p:i.placeholder,t:i.type})).filter(x=>x.v||x.p)});
}

() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'no dialog';
const out=[]; d.querySelectorAll('md-dialog input').forEach(i=>out.push(JSON.stringify({id:i.id,v:i.value,p:i.placeholder,t:i.type})));
d.querySelectorAll('md-dialog section span').forEach(s=>{const t=s.textContent.trim(); if(t&&t.length<40) out.push('SPAN '+t)});
return out.join('\n'); }

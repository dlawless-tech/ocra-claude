() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); const w=d.defaultView;
const st=l=>{ const sec=[...d.querySelectorAll('md-dialog span')].find(x=>x.textContent.trim()===l).closest('section'); return [...sec.querySelectorAll('button')].map(b=>{const s=w.angular.element(b).scope(); return (s.valuePair&&s.valuePair.wanted?'*':'')+(b.className.includes('activeR365')?'A':'')}).join(','); };
return JSON.stringify({acct:d.querySelector('md-dialog md-autocomplete input').value, unap:st('Show Unapproved'), sub:st('Subtotal By'), full:st('Show Comment/Location/#'), cal:st('Calendar')}); }

() => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'nodialog';
const w=d.defaultView;
const inputs=Array.from(d.querySelectorAll('md-dialog input')).map(x=>({id:x.id,v:x.value,p:x.placeholder}));
const groups=['Subtotal By','Show Unapproved'].map(lbl=>{ const s=Array.from(d.querySelectorAll('span')).find(x=>x.textContent.trim()===lbl); if(!s) return lbl+':?'; const sec=s.closest('section'); return lbl+':'+Array.from(sec.querySelectorAll('button')).map(b=>{const v=w.angular.element(b).scope().valuePair; return v.display+(v.wanted?'*':'');}).join(','); });
return JSON.stringify({title:(d.querySelector('md-dialog h2,md-dialog h3')||{}).innerText, inputs, groups});
}

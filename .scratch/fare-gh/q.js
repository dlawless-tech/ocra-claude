async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'no dialog'; const w=d.defaultView;
const el=Array.from(d.querySelectorAll('md-dialog input')).find(x=>x.closest('md-autocomplete'));
const sc=w.angular.element(el.closest('md-autocomplete')).isolateScope(); const o=sc.$parent.r365options;
const out=[]; for(const q of ['Grub','1112','1113','1110','Third Party','Deposit Clearing','Marketing']){ const it=await o.querySearch(q); out.push(q+': '+it.map(i=>i.display).join('; ')); }
return out.join('\n'); }

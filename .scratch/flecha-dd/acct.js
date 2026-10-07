async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'no dialog'; const w=d.defaultView;
const ac=[...d.querySelectorAll('md-dialog md-autocomplete')][0]; const sc=w.angular.element(ac).isolateScope().$parent; const o=sc.r365options;
const its=await o.querySearch('1239'); const it=its[0]; if(!it) return 'no item';
sc.$apply(()=>{ o.selectedItem=it; o.searchText=it.display; o.selectedItemChange(it); });
const btn=(label,i)=>{ const sec=[...d.querySelectorAll('md-dialog span')].find(x=>x.textContent.trim()===label).closest('section'); const b=[...sec.querySelectorAll('button')][i]; const s=w.angular.element(b).scope(); s.$apply(()=>s.buttonSelected(s.valuePair,s.param,{stopPropagation(){},preventDefault(){}})); return s.valuePair.wanted; };
return JSON.stringify({acct:it.display, unap:btn('Show Unapproved',1), sub:btn('Subtotal By',1), full:btn('Show Comment/Location/#',1)}); }

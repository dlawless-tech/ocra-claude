async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); const w=d.defaultView;
const el = Array.from(d.querySelectorAll('md-dialog input')).find(x => /^\d{3}-\d{2} - /.test(x.value));
const ac = el.closest('md-autocomplete'); const sc = w.angular.element(ac).isolateScope(); const o = sc.$parent.r365options;
const it = (await o.querySearch('104-04'))[0];
sc.$parent.$apply(() => { o.selectedItem = it; o.searchText = it.display; o.selectedItemChange(it); });
const pick=(label,disp)=>{ const sec = Array.from(d.querySelectorAll('span')).find(x => x.textContent.trim() === label).closest('section');
  const b = Array.from(sec.querySelectorAll('button')).find(x => w.angular.element(x).scope().valuePair.display === disp);
  const s = w.angular.element(b).scope(); s.$apply(() => s.buttonSelected(s.valuePair, s.param, {stopPropagation(){}, preventDefault(){}}));
  return Array.from(sec.querySelectorAll('button')).map(x=>{const v=w.angular.element(x).scope().valuePair; return v.display+':'+v.wanted;}).join(','); };
const a=pick('Subtotal By','Location'); let u='';
try { u=pick('Show Unapproved','Yes'); } catch(e){ u='err '+e.message; }
await new Promise(r=>setTimeout(r,1000));
return JSON.stringify({acct:el.value, sub:a, unap:u}); }

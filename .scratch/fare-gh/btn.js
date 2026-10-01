() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); const w=d.defaultView;
const set=(label,disp)=>{const sec=Array.from(d.querySelectorAll('span')).find(x=>x.textContent.trim()===label).closest('section');const b=Array.from(sec.querySelectorAll('button')).find(x=>w.angular.element(x).scope().valuePair.display.trim()===disp);const sc=w.angular.element(b).scope();sc.$apply(()=>sc.buttonSelected(sc.valuePair,sc.param,{stopPropagation(){},preventDefault(){}}))};
set('Sum by Transaction','No'); set('Subtotal By','Location'); set('Show Comment/Location/#','Full'); set('Balance','DR(+)/CR(-)');
const grp=(label)=>{const sec=Array.from(d.querySelectorAll('span')).find(x=>x.textContent.trim()===label).closest('section');return Array.from(sec.querySelectorAll('button')).map(b=>w.angular.element(b).scope().valuePair).map(v=>v.display+(v.wanted?'*':'')).join('/')};
return ['Show Unapproved','Sum by Transaction','Subtotal By','Show Comment/Location/#','Balance'].map(l=>l+': '+grp(l)).join(' | ');
}

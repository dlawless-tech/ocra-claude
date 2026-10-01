async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); const w=d.defaultView;
const el=Array.from(d.querySelectorAll('md-dialog input')).find(x=>/^\d{4,6} - /.test(x.value));
const sc=w.angular.element(el.closest('md-autocomplete')).isolateScope(); const o=sc.$parent.r365options;
const items=await o.querySearch('2270'); const it=items[0];
sc.$parent.$apply(()=>{o.selectedItem=it;o.searchText=it.display;o.selectedItemChange(it)});
await new Promise(r=>setTimeout(r,800));
const grp=(label)=>{const sec=Array.from(d.querySelectorAll('span')).find(x=>x.textContent.trim()===label).closest('section');return Array.from(sec.querySelectorAll('button')).map(b=>w.angular.element(b).scope().valuePair).map(v=>v.display+(v.wanted?'*':'')).join('/')};
return [el.value, items.map(i=>i.display).slice(0,5).join(';'), ['Show Unapproved','Sum by Transaction','Subtotal By','Show Comment/Location/#','Balance','Show Comment or Item'].map(l=>l+': '+grp(l)).join(' | ')].join('\n');
}

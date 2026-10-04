async () => { const seen=[]; const walk=d=>{seen.push(d); for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}}; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); const w=d.defaultView;
const pick = async (id, q, match) => { const el=d.querySelector('#'+id); const ac=el.closest('md-autocomplete'); const sc=w.angular.element(ac).isolateScope().$parent; const o=sc.r365options;
  const items=await o.querySearch(q); const it=items.find(x=>match(x.display)); if(!it) return id+' none of '+items.slice(0,15).map(x=>x.display).join(' / ');
  sc.$apply(()=>{o.selectedItem=it;o.searchText=it.display;o.selectedItemChange(it);}); return id+' -> '+it.display; };
const out=[];
out.push(await pick('input-27','1210',x=>/^1210 /.test(x)));
out.push(await pick('input-28','',x=>/^Location$/i.test(x)));
await new Promise(r=>setTimeout(r,2000));
return out.join(' | '); }

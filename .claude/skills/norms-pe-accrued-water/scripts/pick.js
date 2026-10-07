async () => { const ACCT='__A__'; const seen=[]; const walk=d=>{seen.push(d); for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}}; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'no dialog'; const w=d.defaultView;
const ins=Array.from(d.querySelectorAll('md-dialog md-autocomplete input'));
const pick = async (el, q, re) => { const ac=el.closest('md-autocomplete'); const sc=w.angular.element(ac).isolateScope().$parent; const o=sc.r365options;
  const it=(await o.querySearch(q)).find(x=>re.test(x.display)); if(!it) return 'none for '+q;
  sc.$apply(()=>{o.selectedItem=it;o.searchText=it.display;o.selectedItemChange(it);}); return it.display; };
const a=await pick(ins[0],ACCT,new RegExp('^'+ACCT+' ')); const f=await pick(ins[1],'',/^Location$/);
return a+' | '+f; }

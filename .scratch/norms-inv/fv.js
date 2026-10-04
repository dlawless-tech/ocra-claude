() => { const seen=[]; const walk=d=>{seen.push(d); for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}}; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); const w=d.defaultView; const ac=d.querySelector('#input-29').closest('md-autocomplete'); const sc=w.angular.element(ac).isolateScope().$parent; const o=sc.r365options;
const vv=o.ValidValue||[];
return JSON.stringify({isMulti:o.isMulti,multi:o.multiValue,labelArray:o.labelArray,selAll:o.selectAll,cur:o.currentText,prev:o.previousText,vv0:vv[0],vvlen:vv.length}); }

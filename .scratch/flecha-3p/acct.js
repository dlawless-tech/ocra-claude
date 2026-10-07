async () => { const seen=[]; const walk=d=>{seen.push(d); for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}}; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'no dialog'; const w=d.defaultView;
const ac=d.querySelector('md-dialog md-autocomplete'); const o=w.angular.element(ac).isolateScope().$parent.r365options; const out={};
for (const n of ['1210','1235','1237','1238','1239','1242','7161']) { const it=(await o.querySearch(n))[0]; out[n]=it?JSON.stringify(it).slice(0,300):null; }
return JSON.stringify(out); }

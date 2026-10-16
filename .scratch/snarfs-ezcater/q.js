async () => { const seen=[]; const walk=d=>{seen.push(d);for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument)}catch(e){}}}; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'no dialog'; const w=d.defaultView;
const o=w.angular.element(d.querySelector('md-dialog md-autocomplete')).isolateScope().$parent.r365options; const out=[];
for (const q of ['fee','delivery','cater','third','commission','7']) { for (const it of (await o.querySearch(q))) out.push(it.display); }
return [...new Set(out)].join('\n'); }

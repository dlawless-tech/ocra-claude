() => { const seen=[]; const walk=d=>{seen.push(d); for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}}; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'no dialog';
const w=d.defaultView;
const ins=Array.from(d.querySelectorAll('md-dialog input')).map(x=>({id:x.id,v:x.value,p:x.placeholder}));
const groups=Array.from(d.querySelectorAll('md-dialog section')).map(s=>{const bs=Array.from(s.querySelectorAll('button')).map(b=>{const sc=w.angular.element(b).scope();return sc&&sc.valuePair?(sc.valuePair.wanted?'*':'')+sc.valuePair.display:null}).filter(Boolean);return bs.length?(s.querySelector('span')||{}).textContent+': '+bs.join(','):null}).filter(Boolean);
return JSON.stringify({ins,groups,text:d.querySelector('md-dialog').innerText.slice(0,1500)}); }

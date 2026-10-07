() => { const seen=[]; const walk=d=>{seen.push(d); for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}}; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'no dialog';
const s=Array.from(d.querySelectorAll('md-dialog section')).find(s=>/Subtotal By/.test((s.querySelector('span')||{}).textContent||''));
if(!s) return 'no subtotal section';
const b=Array.from(s.querySelectorAll('button')).find(b=>b.textContent.trim()==='Location'); if(!b) return 'no Location button';
b.click(); return 'clicked'; }

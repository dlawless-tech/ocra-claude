async () => {
await new Promise(r=>setTimeout(r,2000));
const seen=[]; const walk=d=>{seen.push(d); for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument)}catch(e){}}}; walk(document);
const out=[];
for (const d of seen) { const $=d.defaultView.jQuery; if(!$) continue;
  $('[data-role=grid]').each((i,el)=>{const g=$(el).data('kendoGrid'); if(!g) return; out.push(g.dataSource.data().map(x=>{const o={};for(const k of Object.keys(x)) if(!/^_|uid|dirty|parent/.test(k)&&typeof x[k]!=='function'&&typeof x[k]!=='object') o[k]=x[k]; ; return o;}));});
  const h=d.body&&d.body.innerText; if(h&&/Journal Entry/.test(h)) out.push(h.slice(0,600));
}
return JSON.stringify(out);
}

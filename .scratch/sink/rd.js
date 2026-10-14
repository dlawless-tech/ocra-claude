async () => {
  await new Promise(r=>setTimeout(r,6000));
  const docs=[document,...[...document.querySelectorAll('iframe')].map(f=>{try{return f.contentDocument}catch(e){return null}}).filter(Boolean)];
  const out=[];
  for (const d of docs){ const $=d.defaultView.jQuery; if(!$) continue;
    $('[data-role=grid]').each((i,el)=>{const g=$(el).data('kendoGrid'); if(!g) return;
      out.push(g.dataSource.data().map(r=>{const o={};for(const k of Object.keys(r.toJSON?r.toJSON():r)){const v=r[k]; if(v!==null&&v!==''&&typeof v!=='object') o[k]=v;} return o;}));});
  }
  const hdr={}; for(const d of docs){ d.querySelectorAll('input').forEach(x=>{ if(x.id && x.value && x.type!=='hidden' && x.offsetParent) hdr[x.id]=x.value; }); }
  return JSON.stringify({hdr,out});
}

() => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const out=[];
for (const d of seen) { const J=d.defaultView.jQuery; if(!J) continue;
  J('[data-role=grid]').each((i,el)=>{ const g=J(el).data('kendoGrid'); if(!g) return;
    out.push('GRID '+i+' rows='+g.dataSource.data().length);
    g.dataSource.data().forEach(r=>{ const o=r.toJSON?r.toJSON():r; out.push(JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k,v])=>v!==null&&v!==''&&v!==0&&typeof v!=='object')))); });
  });
}
const d0 = seen.find(x=>/Attachment/i.test(x.body?.innerText||''));
out.push('HOST '+location.hostname);
out.push('HEADER '+ (seen.map(x=>x.body?.innerText||'').sort((a,b)=>b.length-a.length)[0]||'').slice(0,1500));
return out.join('\n');
}

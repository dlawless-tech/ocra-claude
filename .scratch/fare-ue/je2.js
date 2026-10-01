() => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const out=[];
for (const d of seen) { const J=d.defaultView.jQuery; if(!J) continue;
  J('[data-role=grid]').each((i,el)=>{ const g=J(el).data('kendoGrid'); if(!g) return;
    g.dataSource.data().forEach(r=>out.push([r.glAccount||"-",r.debit||'',r.credit||'',r.comment||'',r.location].join(' | ')));
  });
}
const big=(seen.map(x=>x.body?.innerText||'').sort((a,b)=>b.length-a.length)[0]||'');
out.push('---PAGE---'); out.push(big.slice(big.indexOf("Journal Entry -"),big.indexOf("Journal Entry -")+800)); out.push(big.slice(big.indexOf("items"),big.indexOf("items")+1500));
return out.join('\n');
}

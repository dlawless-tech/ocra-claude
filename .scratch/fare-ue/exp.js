() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const out=[];
for(const d of seen){ const w=d.defaultView; out.push(w.location.href.slice(0,120));
  const h=d.documentElement.innerHTML; const m=h.match(/ExportUrlBase\?"?:\s*"([^"]+)"/); if(m) out.push('EXP '+m[1]);
  const a=d.querySelectorAll('a[onclick*="exportReport"],a[title]'); a.forEach(x=>{ if(/CSV|Excel|XML/.test(x.textContent+x.title)) out.push('A '+x.textContent.trim()+' '+(x.getAttribute('onclick')||'').slice(0,150)); });
}
return out.join('\n'); }

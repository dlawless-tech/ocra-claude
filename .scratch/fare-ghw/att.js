() => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const out=[];
for (const d of seen) {
  for (const i of d.querySelectorAll('input,textarea')) if(i.value && i.type!=='hidden' && i.offsetParent) out.push('IN '+(i.name||i.id||i.placeholder)+' = '+i.value);
  const t=d.body?.innerText||''; const k=t.indexOf('Upload File'); if(k>=0) out.push('ATT '+t.slice(k-600,k+800));
  for (const a of d.querySelectorAll('a')) if(/\.(pdf|xlsx?|csv|png|jpe?g)/i.test(a.innerText+a.href)) out.push('LINK '+a.innerText.trim()+' -> '+a.href);
}
return out.join('\n');
}

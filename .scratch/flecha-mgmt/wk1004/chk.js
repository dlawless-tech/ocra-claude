() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d = seen.find(x=>x.querySelector('md-dialog')); if(!d) return 'no dialog'; const w=d.defaultView; const dlg=d.querySelector('md-dialog');
const out={};
for (const lab of ['Report Type','Filter By','Filter','Calendar','As Of','Show Unapproved']) {
  const sp=Array.from(dlg.querySelectorAll('span')).find(x=>x.textContent.trim()===lab); if(!sp){out[lab]='?';continue;}
  const sec=sp.closest('section'); if(!sec){out[lab]='nosec';continue;}
  const btns=Array.from(sec.querySelectorAll('button')).map(b=>{const sc=w.angular.element(b).scope(); return (b.innerText.trim()||(sc&&sc.valuePair&&sc.valuePair.display)||'')+(b.classList.contains('activeR365')?'*':'')+(sc&&sc.valuePair&&sc.valuePair.wanted?'[W]':'');});
  const inp=Array.from(sec.querySelectorAll('input,md-select')).map(i=>i.value||i.innerText);
  out[lab]={btns,inp, text: sec.innerText.replace(/\s+/g,' ').slice(0,150)};
}
return JSON.stringify(out,null,1); }

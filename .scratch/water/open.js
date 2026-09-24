() => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  const fonts = Array.from(d.querySelectorAll('font')).filter(f => f.innerText.trim() === 'Accrued Water');
  if(!fonts.length) return 'no font cell found';
  fonts[0].click();
  return 'clicked ' + fonts.length;
}

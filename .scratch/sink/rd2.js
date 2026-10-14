async () => {
  await new Promise(r=>setTimeout(r,6000));
  const docs=[document,...[...document.querySelectorAll('iframe')].map(f=>{try{return f.contentDocument}catch(e){return null}}).filter(Boolean)];
  let rows=[];
  for (const d of docs){ const $=d.defaultView.jQuery; if(!$) continue;
    $('[data-role=grid]').each((i,el)=>{const g=$(el).data('kendoGrid'); if(g) rows=rows.concat(g.dataSource.data().filter(r=>r.glAccount).map(r=>[r.glAccount,r.debit,r.credit,r.comment].join(' | ')));});}
  const v=id=>{for(const d of docs){const e=d.getElementById(id); if(e) return e.value}};
  return [v('journalEntryNumber'),v('journalEntryDate'),...rows].join('\n');
}

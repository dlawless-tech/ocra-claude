async () => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
const out=[];
for (const dt of [6,13,20,27].map(n=>new Date(2026,8,n))) {
  g.dataSource.filter({field:'Date', operator:'eq', value:dt}); await new Promise(r=>setTimeout(r,8000));
  const v=g.dataSource.view().filter(x=>x.Number==='UberEats Fees');
  out.push((dt.getMonth()+1)+'/'+dt.getDate()+': '+v.length+' entries, '+v.filter(x=>x.ApprovalStatus==='Approved').length+' approved | '+v.map(x=>x.Location.replace('FARE ','')+' '+x.Amount+(x.Comment?' ['+x.Comment+']':'')).join('; '));
}
return out.join('\n');
}

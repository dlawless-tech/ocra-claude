async () => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
const out=[];
for (const dt of [new Date(2026,8,27), new Date(2026,8,30), new Date(2026,9,1)]) {
  g.dataSource.filter({field:'Date', operator:'eq', value:dt}); await new Promise(r=>setTimeout(r,8000));
  g.dataSource.view().filter(x=>/Uber/.test((x.Number||'')+(x.Name||'')) || (/^NJ/.test(x.Number||'') && x.CreatedBy==='Tricia Laroche')).forEach(x=>out.push([dt.toDateString(),x.Number,x.Location,x.Amount,x.ApprovalStatus,x.TransactionId].join(' | ')));
}
return out.join('\n') || 'none';
}

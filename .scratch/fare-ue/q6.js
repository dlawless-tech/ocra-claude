async () => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'no grid';
const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Date', operator:'eq', value:new Date(2026,8,6)});
await new Promise(r=>setTimeout(r,8000));
return g.dataSource.view().filter(x=>/Uber/.test(x.Number)).map(x=>[x.Number,x.Type,x.Location,x.Amount,x.ApprovalStatus,x.TransactionId,x.Comment||x.Memo||''].join(' | ')).join('\n');
}

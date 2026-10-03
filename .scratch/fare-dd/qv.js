async () => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'no grid';
const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
const out=[];
for (const day of [6,13,20,27]) { g.dataSource.filter({field:'Date', operator:'eq', value:new Date(2026,8,day)});
await new Promise(r=>setTimeout(r,8000));
for (const x of Array.prototype.slice.call(g.dataSource.view())) if (x.Number==='DoorDash') { const ak=Object.keys(x).filter(k=>/ttach/i.test(k)); out.push(['DoorDash 9/'+day,x.Location,x.Amount,x.ApprovalStatus,ak.map(k=>k+'='+x[k]).join(';')].join(' | ')); } }
return out.join('\n');
}

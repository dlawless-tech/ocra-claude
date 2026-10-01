async () => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'nogrid ' + location.href;
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number', operator:'contains', value:'GrubHub'});
await new Promise(r=>setTimeout(r,8000));
const v=g.dataSource.view(); const dt=x=>{const D=new Date(x.Date);return (D.getMonth()+1)+'/'+D.getDate();};
const by={}; v.forEach(x=>{const k=dt(x)+' '+x.Number+' '+x.ApprovalStatus; by[k]=(by[k]||0)+1;});
return 'rows '+v.length+' total '+g.dataSource.total()+' '+JSON.stringify(by);
}

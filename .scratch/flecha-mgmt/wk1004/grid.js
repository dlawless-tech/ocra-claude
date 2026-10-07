async () => { const find=()=>{const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document); return seen.find(x=>x.querySelector('[data-role=grid]') && /Approval Status/.test(x.body.innerText||''));};
let d; for(let i=0;i<40 && !(d=find());i++) await new Promise(r=>setTimeout(r,1500)); if(!d) return 'no grid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); g.dataSource.pageSize(1000);
g.dataSource.filter({logic:'and',filters:[{field:'Number',operator:'contains',value:'mgmt'}]});
await new Promise(r=>setTimeout(r,6000));
const dt=x=>{const D=new Date(x.Date);return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0');};
return JSON.stringify(g.dataSource.view().filter(x=>dt(x)>='2026-09-13').map(x=>({n:x.Number,d:dt(x),loc:x.Location,id:x.TransactionId,st:x.ApprovalStatus,amt:x.Amount,t:x.Type}))); }

async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d=seen.find(x=>x.querySelector('[data-role=grid]') && /Approval Status/.test(x.body.innerText||''));
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
const dt=x=>{const D=new Date(x.Date);return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0');};
return JSON.stringify(g.dataSource.data().filter(x=>/mgmt/i.test(x.Number)).map(x=>({n:x.Number,d:dt(x),id:x.TransactionId,st:x.ApprovalStatus,amt:x.Amount}))); }

async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d=seen.find(x=>x.querySelector('input') && /Approval Status/.test(x.body.innerText||'')); if(!d) return 'nogrid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number',operator:'contains',value:'Grub'}); await new Promise(r=>setTimeout(r,8000));
const dt=x=>{const D=new Date(x.Date); return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0');};
return g.dataSource.view().filter(x=>dt(x)>='2026-08-30').map(x=>[dt(x),x.Number,x.Location,x.TransactionId,x.ApprovalStatus,x.Amount,x.Attachment,x.NewFileName].join(' | ')); }

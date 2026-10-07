async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
 const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } }); if(!d) return 'no grid';
 const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); g.dataSource.pageSize(500);
 await g.dataSource.filter({field:'Number',operator:'eq',value:'Accrued Electricity'});
 const v=g.dataSource.view(); const out=[]; for(let i=0;i<v.length;i++){const x=v[i]; const D=new Date(x.Date); if(D.getMonth()===8&&D.getDate()===12) out.push([x.Location,x.ApprovalStatus,x.Amount,x.CreatedBy,String(x.CreatedOn),x.EntryType,x.TransactionId].join(' | '));}
 return out.join('\n'); }

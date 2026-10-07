async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
 const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } }); if(!d) return 'no grid';
 const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); g.dataSource.pageSize(2000);
 await g.dataSource.filter({logic:'or',filters:[{field:'Name',operator:'contains',value:'Accrued Electricity'},{field:'Number',operator:'contains',value:'Accrued Electricity'}]});
 const v=g.dataSource.view(); const o=[]; for(let i=0;i<v.length;i++){const x=v[i]; if(/^Template/.test(x.Name||'')) o.push([x.Name,x.ApprovalStatus,x.Amount,x.TransactionId].join('\t'));} return o.join('\n'); }

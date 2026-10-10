async () => { let g=null; function walk(w){try{const $=w.jQuery; if($){$('[data-role=grid]',w.document).each((i,e)=>{const k=$(e).data('kendoGrid'); if(k&&!g) g=k;});} for(let i=0;i<w.frames.length;i++) walk(w.frames[i]);}catch(e){} } walk(window);
 g.dataSource.filter({logic:'or',filters:[{field:'Comment',operator:'contains',value:'not in Sage'},{field:'Name',operator:'contains',value:'not in Sage'}]});
 await new Promise(r=>setTimeout(r,8000));
 return g.dataSource.data().map(r=>[r.Id,r.ApprovalStatus,r.Number,r.Date&&new Date(r.Date).toISOString().slice(0,10),r.Amount,r.CheckingAccount,r.TransactionType,r.Comment||r.Name,r.TransactionId].join('|')).join('\n'); }

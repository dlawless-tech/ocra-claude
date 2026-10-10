async () => { let g=null; function walk(w){try{const $=w.jQuery; if($){$('[data-role=grid]',w.document).each((i,e)=>{const k=$(e).data('kendoGrid'); if(k&&!g) g=k;});} for(let i=0;i<w.frames.length;i++) walk(w.frames[i]);}catch(e){} } walk(window);
 g.dataSource.filter({logic:'and',filters:[{field:'Number',operator:'eq',value:'CC'},{field:'ApprovalStatus',operator:'eq',value:'Unapproved'},{field:'CheckingAccount',operator:'contains',value:'Shuka'}]});
 await new Promise(r=>setTimeout(r,10000));
 const d=g.dataSource.data(); let t=0; d.forEach(r=>{t+=(r.TransactionType==='Bank Deposit'?-1:1)*r.Amount}); return d.length+' net '+t.toFixed(2)+'\n'+d.map(r=>[r.ApprovalStatus,new Date(r.Date).toISOString().slice(0,10),r.Amount,r.TransactionType,r.Comment].join('|')).join('\n'); }

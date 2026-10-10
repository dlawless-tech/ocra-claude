async () => { let g=null; function walk(w){try{const $=w.jQuery; if($){$('[data-role=grid]',w.document).each((i,e)=>{const k=$(e).data('kendoGrid'); if(k&&!g) g=k;});} for(let i=0;i<w.frames.length;i++) walk(w.frames[i]);}catch(e){} } walk(window);
 g.dataSource.filter({logic:'and',filters:[{logic:'or',filters:['000101','000118','000121','000122','000123'].map(n=>({field:'Number',operator:'eq',value:n}))},{field:'CheckingAccount',operator:'contains',value:'Shuka'}]});
 await new Promise(r=>setTimeout(r,10000));
 const d=g.dataSource.data(); return d.length+'\n'+d.map(r=>[r.Number,r.ApprovalStatus,new Date(r.Date).toISOString().slice(0,10),r.Amount,r.TransactionType,r.CheckingAccount,r.Comment].join('|')).join('\n'); }

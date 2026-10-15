async () => { const seen=[]; const walk=d=>{seen.push(d); for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument) walk(f.contentDocument)}catch(e){}}}; walk(document);
 const d=seen.find(x=>x.defaultView.jQuery&&x.defaultView.jQuery('[data-role=grid]').length); if(!d) return 'no grid '+seen.length;
 const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); const out=[];
 for (const n of ['NJ00047263','NJ00047431']) { g.dataSource.filter({field:'Number',operator:'eq',value:n}); await new Promise(r=>setTimeout(r,6000)); out.push(...g.dataSource.view().map(x=>[x.Number,x.Location||x.LocationName||'',x.Amount,x.ApprovalStatus,x.TransactionId].join(' | '))); }
 return out.join('\n'); }

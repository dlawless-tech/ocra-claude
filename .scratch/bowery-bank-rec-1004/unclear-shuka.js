async () => { const ids=new Set(["81621a45-a6bd-f111-aaac-000d3a41fbd2","7f621a45-a6bd-f111-aaac-000d3a41fbd2","99621a45-a6bd-f111-aaac-000d3a41fbd2","98621a45-a6bd-f111-aaac-000d3a41fbd2","97621a45-a6bd-f111-aaac-000d3a41fbd2","94621a45-a6bd-f111-aaac-000d3a41fbd2","8a621a45-a6bd-f111-aaac-000d3a41fbd2","89621a45-a6bd-f111-aaac-000d3a41fbd2","90621a45-a6bd-f111-aaac-000d3a41fbd2","8b9cf650-b4b7-f111-aaac-000d3a41fbd2"]); const sl=n=>new Promise(r=>setTimeout(r,n)); let n=0; const log=[];
 for (const id of ['ChecksWithdrawalsGrid','DepositsOtherCreditsGrid']) { const g=jQuery('#'+id).data('kendoGrid'); const ds=g.dataSource; const pages=Math.ceil(ds.total()/ds.pageSize());
  for (let p=1;p<=pages;p++) { if (ds.page()!==p) { const sb=g.content.find('.k-scrollbar-vertical')[0]||g.content[0]; ds.page(p); await sl(2500); }
   ds.data().forEach(r=>{ if(!ids.has(r.transactionDetailId)) return; const cb=jQuery('#'+id+' tr[data-uid='+r.uid+'] input[type=checkbox]')[0]; if(cb && cb.checked){ cb.click(); n++; } });
   log.push(id+' p'+p+' trs '+jQuery('#'+id+' tbody tr').length); }
  if (ds.page()!==1) { ds.page(1); await sl(2500); } }
 const left=[]; for (const id of ['ChecksWithdrawalsGrid','DepositsOtherCreditsGrid']) jQuery('#'+id).data('kendoGrid').dataSource.data().forEach(r=>{ if(ids.has(r.transactionDetailId)&&r.cleared) left.push(r.transactionDetailId) });
 return n+' unchecked, still cleared '+left.length+' | '+log.join(', ')+' | '+document.body.innerText.match(/Cleared Balance[\s\S]{0,80}/)[0].replace(/\s+/g,' '); }

() => { const ids=new Set(["9278c909-22c4-f111-aaac-000d3a41fbd2","3fdd27e2-21c4-f111-aaac-000d3a41fbd2"]); let n=0; const miss=[];
 for (const id of ['ChecksWithdrawalsGrid','DepositsOtherCreditsGrid']) { const g=jQuery('#'+id).data('kendoGrid');
  g.dataSource.data().forEach(r=>{ if(!ids.has(r.transactionDetailId)) return; const cb=jQuery('#'+id+' tr[data-uid='+r.uid+'] input[type=checkbox]')[0]; if(!cb.checked) cb.click(); n++; }); }
 const res={n}; for (const id of ['ChecksWithdrawalsGrid','DepositsOtherCreditsGrid']) { const g=jQuery('#'+id).data('kendoGrid'); res[id]=g.dataSource.data().filter(r=>r.cleared==1||r.cleared===true).length+'/'+jQuery('#'+id+' input.'+(id[0]=='C'?'Withdrawals':'DepositsOtherCredits')+'-Grid-check-box:checked').length; }
 return JSON.stringify(res); }

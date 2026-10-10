() => { const ids=new Set(["78127595-52bf-f111-aaac-000d3a41fbd2","9c127595-52bf-f111-aaac-000d3a41fbd2","9b127595-52bf-f111-aaac-000d3a41fbd2","9e127595-52bf-f111-aaac-000d3a41fbd2","ef827bee-6aac-f111-aaa9-000d3a41fbd2","76570596-c85c-4243-3114-08df0dee72e6"]); let n=0; const miss=[];
 for (const id of ['ChecksWithdrawalsGrid','DepositsOtherCreditsGrid']) { const g=jQuery('#'+id).data('kendoGrid');
  g.dataSource.data().forEach(r=>{ if(!ids.has(r.transactionDetailId)) return; const cb=jQuery('#'+id+' tr[data-uid='+r.uid+'] input[type=checkbox]')[0]; if(!cb.checked) cb.click(); n++; }); }
 const res={n}; for (const id of ['ChecksWithdrawalsGrid','DepositsOtherCreditsGrid']) { const g=jQuery('#'+id).data('kendoGrid'); res[id]=g.dataSource.data().filter(r=>r.cleared==1||r.cleared===true).length+'/'+jQuery('#'+id+' input.'+(id[0]=='C'?'Withdrawals':'DepositsOtherCredits')+'-Grid-check-box:checked').length; }
 return JSON.stringify(res); }

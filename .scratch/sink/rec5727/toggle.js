() => { const t={"on":["9087e08d-f8c7-f111-aac1-000d3a9f2fba","8787e08d-f8c7-f111-aac1-000d3a9f2fba","8a87e08d-f8c7-f111-aac1-000d3a9f2fba","8487e08d-f8c7-f111-aac1-000d3a9f2fba","a30f26aa-2fb8-f111-aac1-000d3a9f2fba"],"off":["ca79e4b7-f1c7-f111-aac1-000d3a9f2fba","889747c5-f1c7-f111-aac1-000d3a9f2fba"]}; let n=0; const g=jQuery('#ChecksWithdrawalsGrid').data('kendoGrid');
 g.dataSource.data().forEach(r=>{ const want=t.on.includes(r.transactionDetailId)?true:t.off.includes(r.transactionDetailId)?false:null; if(want===null) return;
  const cb=jQuery('#ChecksWithdrawalsGrid tr[data-uid='+r.uid+'] input[type=checkbox]')[0]; if(!cb) return; if(cb.checked!==want){cb.click(); n++;} });
 return JSON.stringify({n, diff: jQuery('[ng-model*=difference], #difference').val()||null}); }

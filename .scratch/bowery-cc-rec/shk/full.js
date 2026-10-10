() => { const o={}; const m=(id)=>jQuery('#'+id).data('kendoGrid').dataSource.data().map(r=>r.toJSON());
 o.w=m('ChecksWithdrawalsGrid'); o.d=m('DepositsOtherCreditsGrid');
 const s=angular.element(document.getElementById('StatementEndBalance')).scope(); o.model=Object.fromEntries(Object.entries(s.model||{}).filter(([k,v])=>typeof v!=='object'));
 o.text=document.body.innerText.slice(0,1500); return JSON.stringify(o); }

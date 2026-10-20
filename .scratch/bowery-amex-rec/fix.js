async () => { const sl=n=>new Promise(r=>setTimeout(r,n));
 const el=document.getElementById('BeginningBalance'); el.focus(); el.value='0.00'; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); el.dispatchEvent(new Event('blur',{bubbles:true})); angular.element(el).scope().$apply(); await sl(1500);
 const on=new Set(["5932b568-22ae-f111-aaa9-000d3a41fbd2","5ecc7937-38ca-f111-aaac-000d3a41fbd2","10ff0b76-38ca-f111-aaac-000d3a41fbd2","c1ae2ba3-38ca-f111-aaac-000d3a41fbd2"]);
 const off=new Set(["924aab8d-1abd-f111-aaac-000d3a41fbd2","2cd5a994-1abd-f111-aaac-000d3a41fbd2","69e1559d-1abd-f111-aaac-000d3a41fbd2"]);
 const log=[]; let found=0;
 for (const id of ['ChecksWithdrawalsGrid','DepositsOtherCreditsGrid']) { const g=jQuery('#'+id).data('kendoGrid');
  g.dataSource.data().forEach(r=>{ const t=r.transactionId; if(!on.has(t)&&!off.has(t)) return; found++; const cb=jQuery('#'+id+' tr[data-uid='+r.uid+'] input[type=checkbox]')[0]; if(!cb){log.push('nocb '+t);return;} if(on.has(t)&&!cb.checked){cb.click();log.push('on '+(r.credit||r.debit));} if(off.has(t)&&cb.checked){cb.click();log.push('off '+(r.credit||r.debit));} }); }
 await sl(1500);
 return found+' found | '+log.join(', ')+' | beg '+el.value+' | '+document.body.innerText.match(/Checks\/Withdrawals[\s\S]{0,260}/)[0].replace(/\s+/g,' '); }

async () => {
  const H={authorization:'Bearer '+sessionStorage.getItem('authToken'),accept:'application/json'};
  const deps={"2224512":"Cookshop","2221704":"Shuka"}; const out={};
  const sum = await (await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/2224512,2221704/deposits/summary?startTime='+encodeURIComponent('2026-09-20T00:00:00.000Z')+'&endTime='+encodeURIComponent('2026-09-25T06:59:59.000Z'),{headers:H})).json();
  for (const [r,a] of Object.entries(sum)) for (const d of a) {
    const j = await (await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/'+r+'/deposits/'+d.restaurant_distribution_id,{headers:H})).json();
    const by={}; const odd=[];
    for (const t of j.associated_transactions) { const k=new Date(t.transaction_time).toLocaleDateString('en-US',{timeZone:'America/New_York'}); by[k]=(by[k]||0)+t.prepaid_amount; if(t.transaction_type!=='PCI_SINGLE_ONLINE') odd.push([t.transaction_type,k,t.prepaid_amount,t.order_number]); }
    out[deps[r]]={by,odd};
  }
  return JSON.stringify(out);
}

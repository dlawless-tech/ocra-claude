const fs=require('fs');
const rows=JSON.parse(JSON.parse(fs.readFileSync('grid2.raw','utf8'))).filter(r=>r.d==='2026-10-10');
const plan=require('./plan.json'); const held=new Set(['North Torrance','Ontario','Van Nuys']);
let tot=0; const stores=plan.map(p=>{ const r=rows.find(x=>x.loc===p.store);
  const status= held.has(p.store)?'held': (r&&r.st==='Approved'&&Math.abs(r.amt-p.accrual)<0.005?'approved':'failed');
  if(status==='approved') tot+=r.amt;
  return {store:p.store,status,netSales:p.netSales,accrual:p.accrual,amount:r?r.amt:null,prior:p.prior,transactionId:r?r.id:null,
    warnings: status==='held'?[`accrual ${p.accrual.toFixed(2)} is ${((1-p.accrual/p.prior)*100).toFixed(1)}% below prior ${p.prior.toFixed(2)}; likely missing sales days`]:status==='failed'?['grid does not read Approved at accrual']:[]}; });
console.log('rows',rows.length); stores.forEach(s=>console.log(s.store,s.status,s.accrual,s.amount)); console.log('posted total',tot.toFixed(2));
fs.writeFileSync('result.json',JSON.stringify({weekEnding:'10/10/2026',note:'Held 3 stores more than 10% below prior week: North Torrance (0.00 net sales), Ontario (-11.9%), Van Nuys (-16.2%). Posted total '+tot.toFixed(2)+'.',stores},null,1));

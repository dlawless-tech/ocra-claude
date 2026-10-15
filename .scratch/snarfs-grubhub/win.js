const a=JSON.parse(JSON.parse(require('fs').readFileSync(process.argv[2],'utf8')));
const day=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
const names={8704528:'Fenton',8706056:'Kirkwood',8701720:'MX',8707584:'Page',8706184:'SLU',8704520:'Skinker'};
for (const [s,e] of process.argv.slice(3).map(w=>w.split(':'))) { console.log('window',s,e);
 const o={};
 for (const t of a) { if(t.transaction_type==='DISTRIBUTION') continue; const d=day(t.transaction_time); if(d<s||d>e) continue;
  const r=o[names[t.restaurant_id]]=o[names[t.restaurant_id]]||{gross:0,comm:0,del:0,proc:0,rew:0,promo:0,refund:0,net:0,n:0};
  if(t.transaction_type==='PCI_SINGLE_REFUND'){r.refund+=t.net_amount;} else {r.gross+=t.prepaid_amount;r.comm+=t.advertising_fee;r.del+=t.grubhub_delivery_fee;r.proc+=t.processing_fee;r.rew+=t.restaurant_funded_reward;r.promo+=t.restaurant_funded_promo;}
  r.net+=t.net_amount; r.n++; }
 for (const [k,r] of Object.entries(o)) console.log(k.padEnd(9),Object.entries(r).map(([x,v])=>x+'='+(x==='n'?v:(v/100).toFixed(2))).join(' '));
}

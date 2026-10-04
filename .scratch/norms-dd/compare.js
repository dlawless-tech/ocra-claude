const P=require('./payouts.json').summariesList, E=require('./entries.json'), A=require('./ar.json');
const map=require('C:/Users/trici/ocra-claude/.claude/skills/norms-doordash/scripts/stores.json');
const n=s=>parseFloat(s.replace(/[$,]/g,'')); const r2=x=>Math.round(x*100)/100;
const wk={'9/17/2026':'9/12/2026','9/24/2026':'9/19/2026','10/1/2026':'9/26/2026'};
const plan=[];
for(const p of P){ const ed=wk[p.payoutDate]; if(!ed) continue; const loc=map[p.storeId];
  const [m,d]=ed.split('/'); const key='2026-'+m.padStart(2,'0')+'-'+d.padStart(2,'0')+'|'+loc; const e=E[key]; const a=A[loc][ed];
  const S=n(p.sales), C=-n(p.commissionAndFees), M=-n(p.marketingSpend), AM=n(p.amendments), N=n(p.netPayout);
  const idOk=Math.abs(S-C-M+AM-N)<0.005;
  const want={ar:[0,r2(a.D-N)], com:[C,0], mkt:[M,0], amd:AM<0?[-AM,0]:[0,AM], dif:r2(a.D-S)>=0?[r2(a.D-S),0]:[0,r2(S-a.D)]};
  const L={}; for(const l of e.lines) L[l[3]]=[l[1],l[2]];
  const got={ar:L['a/r doordash - payout'], com:L['commission & fees'], mkt:L['marketing spend'], amd:L['amendments'], dif:L['difference']};
  const bad=Object.keys(want).filter(k=>Math.abs(want[k][0]-got[k][0])>0.005||Math.abs(want[k][1]-got[k][1])>0.005);
  plan.push({key,loc,ed,id:e.id,payoutId:p.payoutId,S,C,M,AM,N,D:a.D,want,got,bad,idOk});
}
require('fs').writeFileSync('compare.json',JSON.stringify(plan,null,1));
const f=v=>v[0]?'Dr '+v[0].toFixed(2):v[1]?'Cr '+v[1].toFixed(2):'0';
for(const x of plan.sort((a,b)=>a.key<b.key?-1:1)) if(x.bad.length||!x.idOk) console.log(x.ed, x.loc.padEnd(16), x.idOk?'':'DD-IDENTITY-FAILS', x.bad.map(k=>k+': posted '+f(x.got[k])+' want '+f(x.want[k])).join(' | '));
console.log('checked', plan.length, 'wrong', plan.filter(x=>x.bad.length).length);

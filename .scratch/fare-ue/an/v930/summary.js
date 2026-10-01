const {L,LOCS,r2}=require('./model');const {rows}=require('./periods');
const S=[];
for(const l of LOCS){const x=L[l],u=x.ue,rs=rows.filter(r=>r.loc===l);
 const glPaid=rs.reduce((s,r)=>s+r.glDss,0),ueInc=rs.reduce((s,r)=>s+r.ueInc,0),pay=rs.reduce((s,r)=>s+r.payout,0),dep=rs.reduce((s,r)=>s+r.depAmt,0);
 const ded=u.inc-u.payout;const fees=x.gl.fees;const A=x.unpaid.amt;
 const B=glPaid-ueInc,C=ded-fees,D=pay-dep;const corrected=l==='FARE Holding LLC'?x.gl.open:B+A+C+D;
 const pre=rs.filter(r=>r.start==='2025-12-29'&&!/Lakeview|Old Town/.test(l)&&r.salesVar<-1).reduce((s,r)=>s+r.salesVar,0);
 const sept=x.ueSept.ded;
 S.push({loc:l,orders:u.orders,ueExc:r2(u.exc),ueTax:r2(u.tax),ueInc:r2(ueInc),glPaid:r2(glPaid),B:r2(B),preWin:r2(pre),Bops:r2(B-pre),ded:r2(ded),fees:r2(fees),C:r2(C),sept:r2(sept),Cops:r2(C-sept),pay:r2(pay),dep:r2(dep),D:r2(D),A:r2(A),corrected:r2(corrected),posted:r2(x.gl.end),postDiff:r2(x.gl.end-corrected),aje:r2(x.gl.aje),open:r2(x.gl.open),glDssAll:r2(x.gl.dss),glDepPosted:r2(x.gl.dep),mf:r2(u.mf),mkt:r2(u.offers+u.orf+u.madj+u.other),offers:r2(u.offers),orf:r2(u.orf),madj:r2(u.madj),other:r2(u.other),cb:r2(u.cb),mft:r2(u.mft),bw:r2(u.bw),unl:r2(ded+u.mf+u.offers+u.orf+u.madj+u.other+u.cb+u.mft+u.bw),fee:x.fee,dec:x.ueDec});}
module.exports={S};
if(require.main===module){console.table(S.map(s=>({loc:s.loc.slice(5,20),ueInc:s.ueInc,glPaid:s.glPaid,B:s.B,pre:s.preWin,ded:s.ded,fees:s.fees,C:s.C,sept:s.sept,D:s.D,A:s.A,corr:s.corrected,posted:s.posted,diff:s.postDiff})));
const t=k=>r2(S.reduce((a,s)=>a+s[k],0));console.log('tot corrected',t('corrected'),'posted',t('posted'),'unl',t('unl'),'bw',t('bw'));
console.table(S.map(s=>({loc:s.loc.slice(5,20),mf:s.mf,gl7380:r2(s.fee['7380']||0),mkt:s.mkt,gl7630:r2(s.fee['7630']||0),gl4905:r2(s.fee['4905']||0),cb:s.cb,gl7535:r2(s.fee['7535']||0),mft:s.mft,bw:s.bw,gl2270:r2(s.fee['2270']||0)})));}

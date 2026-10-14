const fs=require('fs'); const W=process.argv[2];
const rd=f=>{let j=JSON.parse(fs.readFileSync(f,'utf8'));return typeof j==='string'?JSON.parse(j):j;};
const grid=rd(W+'/grid.json'), gl=rd(W+'/gl.json'), work=rd(W+'/work-1003.json');
const warn={
 'North Torrance':['Posted entry credits A/R 18.76; the formula gives 168.32 (D 417.04 less deposit 248.72). The 10/4 (24.87) and 10/5 (124.69) DSS debits look to have landed after the entry was made, so A/R 1113 sits at 398.28 against the 248.72 deposit, 149.56 over. Approved entry left as is.'],
 'Orange':['Posted entry credits A/R 32.12; the formula gives 31.62, so A/R 1113 sits at 122.27 against the 122.77 deposit, 0.50 short. Refund 47.89 / Discrepancy 47.39 lines net to 0.50. Approved entry left as is.'],
 'Santa Ana':['A second Santa Ana GrubHub template sits at 10/13/2026 (0.00, Approved) with no 10/10 one; the next period likely needs it.']
};
const s0930=grid.filter(r=>r[0]==='2026-09-30').map(r=>({store:r[2],status:'skipped',amount:r[4],deposits:((gl[r[2]]||{}).deps||[]).filter(d=>/^26100201/.test(d.sid)).map(d=>d.sid),transactionId:r[5],warnings:['Posted and approved on 10/6.']}));
const s1003=grid.filter(r=>r[0]==='2026-10-03').map(r=>{const w=work.find(x=>x.loc===r[2]);return {store:r[2],status:'skipped',amount:r[4],deposits:w?w.deps:[],transactionId:r[5],warnings:['Already posted and approved before this run.'].concat(warn[r[2]]||[])};});
s1003.push({store:'Costa Mesa',status:'failed',amount:5.38,deposits:['26100907o4jHQUr'],transactionId:'',warnings:['No 10/3/2026 GrubHub entry exists for Costa Mesa, so nothing was posted. Needed: Cr 1113 5.38, Dr commissions 2.05, delivery commissions 2.28, order processing fees 1.05, plug 0.00 (D 24.53, deposit 19.15).']});
s1003.sort((a,b)=>a.store.localeCompare(b.store)); s0930.sort((a,b)=>a.store.localeCompare(b.store));
const r={period:'9/29/2026 - 10/5/2026',note:'Nothing posted this run: the 9/30 and 10/3 entries were already posted and approved. 20 of the 23 posted 10/3 entries match Grubhub and the GL. North Torrance and Orange are off (see warnings), and Costa Mesa has no 10/3 entry. Encino has no R365 location.',entries:[{date:'9/30/2026',window:'9/29-9/30',stores:s0930},{date:'10/3/2026',window:'10/1-10/5',stores:s1003}]};
fs.writeFileSync(W+'/result.json',JSON.stringify(r,null,1));
console.log(s0930.length,s1003.length);

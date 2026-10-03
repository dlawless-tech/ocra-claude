const fs=require('fs'); const c=fs.readFileSync('.scratch/bue-gl-cells.txt','utf8').split(/\r?\n/);
const num=s=>/^-?[\d,]+\.\d\d$/.test(s)?parseFloat(s.replace(/,/g,'')):null;
const out={}; let loc=null, row=null; const rows=[];
for(let i=0;i<c.length;i++){ const s=c[i];
  if(c[i+1]==='104-04 - A/R - Uber Eats'){ loc=s; out[loc]={beg:null,rows:[]}; continue; }
  if(s==='Beg Balance:'){ out[loc].beg=num(c[i+1]); continue; }
  if(/^Total /.test(s)){ if(row){out[loc].rows.push(row);row=null;} const n=[]; for(let j=i+1;j<i+5&&n.length<3;j++){const v=num(c[j]); if(v!==null)n.push(v);} if(loc) out[loc].total=n; continue; }
  if(/^\d+\/\d+\/2026$/.test(s)){ if(row) out[loc].rows.push(row); row={date:s,f:[]}; continue; }
  if(row) row.f.push(s);
}
const wk=d=>{const [m,dd]=d.split('/').map(Number); const day=m===8?dd-31:dd+(m===10?30:0); if(day<=6)return'09-06'; if(day<=13)return'09-13'; if(day<=20)return'09-20'; if(day<=27)return'09-27'; return '09-30';};
for(const [l,b] of Object.entries(out)){ console.log('== '+l+' beg '+b.beg+' total '+JSON.stringify(b.total));
  const W={}; for(const r of b.rows){ const n=r.f.map(num).filter(v=>v!==null); const [dr,cr,bal]=n.slice(-3); const t=r.f[0]; const w=wk(r.date); W[w]=W[w]||{D:0,other:[]};
    if(t==='Journal Entry' && dr>0 && cr===0) W[w].D+=dr; else W[w].other.push(r.date+' '+r.f.filter(x=>num(x)===null).join('|')+' dr '+dr+' cr '+cr+' bal '+bal); }
  for(const [w,v] of Object.entries(W)){ console.log(w,'D',v.D.toFixed(2)); v.other.forEach(o=>console.log('   ',o)); } }

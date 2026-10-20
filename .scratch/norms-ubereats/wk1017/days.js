const fs=require('fs');const c=fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/);
const out={};let cur=null;
for(let i=0;i<c.length;i++){
 if(c[i+1]==='1112 - A/R Uber Postmates'&&c[i+2]==='Beg Balance:'){cur=c[i];out[cur]={};i+=3;continue;}
 if(!cur)continue;
 if(/^\d+\/\d+\/\d{4}$/.test(c[i])&&c[i+1]==='Journal Entry'){out[cur][c[i]]=(out[cur][c[i]]||0)+ +c[i+4].replace(/,/g,'');}
 if(c[i]==='Total A/R Uber Postmates')cur=null;
}
for(const k in out){const d=Object.keys(out[k]);console.log(k.padEnd(17),d.length,d.map(x=>x.replace('/2026','')+':'+out[k][x].toFixed(2)).join(' '));}

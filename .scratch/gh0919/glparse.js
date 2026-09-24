const fs=require('fs');const c=fs.readFileSync('.scratch/gh0919/gl.cells','utf8').split(/\r?\n/);
const out={};let cur=null;
for(let i=0;i<c.length;i++){
  if(c[i+1]==='1113 - A/R Grubhub' && c[i+2]==='Beg Balance:'){cur={loc:c[i],beg:+c[i+3].replace(/,/g,''),deps:[],je:[]};out[c[i]]=cur;i+=3;continue;}
  if(!cur)continue;
  if(c[i]==='Bank Deposit'){cur.deps.push({date:c[i-1],memo:c[i+2],cr:c[i+4]});}
  if(c[i]==='Total A/R Grubhub'){cur.D=+c[i+1].replace(/,/g,'');cur.C=+c[i+2].replace(/,/g,'');cur.end=+c[i+3].replace(/,/g,'');cur=null;}
}
fs.writeFileSync('.scratch/gh0919/gl.json',JSON.stringify(out,null,1));
for(const k in out){const o=out[k];console.log(k.padEnd(17),'beg',o.beg.toFixed(2).padStart(8),'D',String(o.D).padStart(8),'C',String(o.C).padStart(8),'end',String(o.end).padStart(8),o.deps.map(d=>d.date+' '+(d.memo.match(/\d{8}\S+/)||['?'])[0]+' '+d.cr).join(' ; '));}
console.log(Object.keys(out).length);

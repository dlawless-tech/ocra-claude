const fs=require('fs');const rd=f=>{let j=JSON.parse(fs.readFileSync(f,'utf8'));return typeof j==='string'?JSON.parse(j):j;};
const work=rd(process.argv[2]),tpl=rd(process.argv[3]);
const FIX=['ar grubhub - deposit','commissions','delivery commissions','order processing fees','sales tax'];
const n=s=>+String(s).replace(/,/g,'')||0;
for(const w of work){const t=tpl.find(x=>x.loc===w.loc);
 const got={};for(const l of t.L){const c=FIX.includes(l[3])?l[3]:'plug';got[c]=(got[c]||0)+n(l[1])-n(l[2]);}
 const want={};for(const l of w.lines){const c=FIX.includes(l.comment)?l.comment:'plug';want[c]=(want[c]||0)+(l.col==='debit'?l.amount:-l.amount);}
 const diffs=[];for(const k of new Set([...Object.keys(got),...Object.keys(want)])){const d=(got[k]||0)-(want[k]||0);if(Math.abs(d)>0.005)diffs.push(k+' has '+(got[k]||0).toFixed(2)+' want '+(want[k]||0).toFixed(2));}
 console.log(w.loc.padEnd(17),diffs.length?'WRONG: '+diffs.join('; '):'ok', '| comments:',t.L.map(l=>l[0]+':'+l[3]).join(', '));}

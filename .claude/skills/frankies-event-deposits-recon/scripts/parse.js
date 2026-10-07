const fs=require('fs');const c=fs.readFileSync(process.argv[2],'utf8').split('\n').map(s=>s.replace(/^link "/,'').trim());
const num=s=>/^-?[\d,]+\.\d\d$/.test(s);const rows=[];let acct='';
for(let i=0;i<c.length;i++){ if(/^\d{4} - /.test(c[i])){acct=c[i];continue;}
 if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(c[i])&&!num(c[i+1])){const r={acct,date:c[i],type:c[i+1],ref:c[i+2],loc:c[i+3]};let j=i+4;r.comment=num(c[j])?'':c[j++];r.dr=c[j];r.cr=c[j+1];r.bal=c[j+2];rows.push(r);i=j+2;}}
console.log(JSON.stringify(rows));

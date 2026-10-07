// rows of gl<acct>.txt -> {date,type,num,loc,cmt,dr,cr,kind}
const fs=require('fs'); const n=s=>+s.replace(/,/g,'').replace(/^\((.*)\)$/,'-$1');
module.exports=f=>fs.readFileSync(f,'utf8').trim().split('\n').filter(l=>/^\d+\/\d+\/\d{4}\|/.test(l)).map(l=>{const p=l.split('|');const [date,type,num,loc]=p;const cmt=p.length>7?p.slice(4,-3).join('|'):'';const [dr,cr]=p.slice(-3,-1).map(n);
 const kind=/^JE000/.test(num)&&type==='Journal Entry'?'sales':type==='Bank Deposit'?'deposit':/^3rd Party/.test(num)?'fee':'other';return {date,type,num,loc,cmt,dr,cr,kind};});

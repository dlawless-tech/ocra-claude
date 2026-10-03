// GL Account Detail cells (Subtotal By Location) -> {location: {YYYY-MM-DD: journal entry debits}}
// usage: node gl-days.js <cells.txt>   (cells from: grep -oE 'cell "[^"]*"' snapshot | sed 's/^cell "//; s/"$//')
const c=require("fs").readFileSync(process.argv[2],"utf8").split(/\r?\n/);
const num=s=>/^-?[\d,]+\.\d\d$/.test(s), n=s=>parseFloat(s.replace(/,/g,""));
const iso=d=>{const[m,dd,y]=d.split("/");return y+"-"+m.padStart(2,"0")+"-"+dd.padStart(2,"0")};
const out={}; let loc=null;
for(let i=0;i<c.length;i++){
  if(c[i]==="Beg Balance:"){loc=c[i-2];out[loc]=out[loc]||{};continue;}
  if(!/^\d+\/\d+\/\d{4}$/.test(c[i]))continue;
  let j=i+1,t=[]; while(j<c.length&&!(num(c[j])&&num(c[j+1])&&num(c[j+2]))){t.push(c[j]);j++;}
  if(t[0]==="Journal Entry"&&n(c[j])>0){const k=iso(c[i]);out[loc][k]=+((out[loc][k]||0)+n(c[j])).toFixed(2);}
  i=j+2;
}
console.log(JSON.stringify(out,null,1));

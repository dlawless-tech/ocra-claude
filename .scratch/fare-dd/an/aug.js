const {det,M}=require('./dd');const {cat}=require('./model');
const r2=x=>Math.round(x*100)/100;const T={};
for(const x of det){const d=x['Timestamp local date'];if(d.slice(0,7)!=='2026-08')continue;const l=M[x['Store ID']];const c=cat(x);const t=T[l]=T[l]||{};for(const k in c)t[k]=r2((t[k]||0)+c[k]);t.comm_only=r2((t.comm_only||0)-x.Commission);t.ppf=r2((t.ppf||0)-x['Payment processing fee']);}
console.table(T);

#!/bin/bash
# AP Aging, Detail, Show Unapproved Yes, for dLena's legal entity, as CSV.
# Usage: pull-aging.sh <session> <as of M/D/YYYY> <out.csv>
# Runs Bowery's report puller with the dLena host swapped in; copies land in ./.dl-pr.
set -u
SRC="$(cd "$(dirname "$0")/../../bowery-sage-ap-begbal/scripts" && pwd)"
mkdir -p .dl-pr
sed 's/bowerygroup\.restaurant365\.com/unoatfifth.restaurant365.com/g' "$SRC/pull-report.sh" > .dl-pr/pull-report.sh
cp -r "$SRC/eval" .dl-pr/
bash .dl-pr/pull-report.sh "$1" aging "UNO at 5th" "$2" "$3" || exit 1
# vendor totals; must sum to the report's grand total
node -e '
const L=require("fs").readFileSync(process.argv[1],"utf8").split(/\r?\n/).slice(3);
const parse=l=>{const o=[];let c="",q=false;for(const ch of l){if(ch==="\"")q=!q;else if(ch===","&&!q){o.push(c);c=""}else c+=ch}o.push(c);return o};
const h=parse(L[0]),ix=n=>h.indexOf(n),num=x=>+String(x).replace(/,/g,"")||0;
const B=["AmountCurrent","Amount30","Amount60","Amount90","Amount91"],v={};let gt=null;
for(const l of L.slice(1)){if(!l.trim())continue;const r=parse(l),n=r[ix("VendorName")];if(!n)continue;
 if(gt===null)gt=num(r[ix("TotalGT")]);(v[n]=v[n]||B.map(()=>0)).forEach((_,i)=>v[n][i]+=num(r[ix(B[i])]))}
let t=0;for(const [n,a] of Object.entries(v).sort()){const s=a.reduce((x,y)=>x+y,0);t+=s;console.log(n.slice(0,36).padEnd(36)+a.concat(s).map(x=>x.toFixed(2).padStart(11)).join(""))}
console.log("TOTAL "+t.toFixed(2)+(Math.abs(t-gt)<0.005?" ties":" DOES NOT TIE to report "+gt.toFixed(2)))' "$3"

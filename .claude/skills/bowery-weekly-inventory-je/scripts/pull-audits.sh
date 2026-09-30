#!/bin/bash
# Pull each store's Inventory by GL for the week and the week before from Craftable,
# and save the week's export as att/<store>/MM.DD.YY.xlsx.
#
# Usage: pull-audits.sh <session> <week ending YYYY-MM-DD>
# Writes audits.json. Run craftable-login.sh first; returns to tab 0.
set -u
S="$1"; WE="$2"; HERE="$(cd "$(dirname "$0")" && pwd)"
read -r CF CT PF PT NAME < <(node -e '
const e=new Date(process.argv[1]+"T12:00:00Z"); if(e.getUTCDay()!==0){console.log("NOTSUNDAY");process.exit()}
const d=n=>{const x=new Date(e);x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const p=s=>s.split("-");const [y,m,dd]=p(d(0));
console.log(d(-6),d(0),d(-13),d(-7),m+"."+dd+"."+y.slice(2)+".xlsx")' "$WE")
[ "$CF" = NOTSUNDAY ] && { echo "FAIL: $WE is not a Sunday"; exit 1; }
T=$(bash "$HERE/craftable-login.sh" $S) || { echo "$T"; exit 1; }

STORES=$(node -e 'console.log(JSON.stringify(require(process.argv[1]).map(s=>[s.key,s.craftable])))' "$HERE/stores.json")
playwright-cli -s=$S eval "async () => { const q=async(id,f,t)=>{const h={'content-type':'application/json','store-id':String(id),'labor-store-id':'0','director-brand-id':'0','application-code':'3'}; const r=await fetch('/internal/buyer/books/reports/inventory-gl',{method:'POST',headers:h,body:JSON.stringify({fromDate:f,toDate:t})}); if(!r.ok) throw new Error('HTTP '+r.status+' store '+id); return (await r.json()).lines;}; const out={weekEnd:'$CT',prevEnd:'$PT',stores:{}}; for (const [n,id] of $STORES) out.stores[n]={prev:await q(id,'$PF','$PT'), cur:await q(id,'$CF','$CT')}; return JSON.stringify(out); }" 2>&1 \
  | sed -n '/### Result/,/### Ran/p' | sed '1d;$d' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{require("fs").writeFileSync("audits.json",JSON.stringify(JSON.parse(JSON.parse(s.trim())),null,1))}catch(e){console.error("FAIL: audit pull: "+s.slice(0,300));process.exit(1)}})' || exit 1

for p in $(node -e 'require(process.argv[1]).forEach(s=>console.log(s.key+":"+s.craftable))' "$HERE/stores.json"); do
  n=${p%%:*}; id=${p##*:}; mkdir -p "att/$n"
  playwright-cli -s=$S eval "async () => { const h={'store-id':'$id','labor-store-id':'0','director-brand-id':'0','application-code':'3'}; const r=await fetch('/internal/buyer/books/reports/inventory-gl-xls?fromDate=$CF&toDate=$CT',{headers:h}); const b=new Uint8Array(await r.arrayBuffer()); let s=''; for(const x of b) s+=String.fromCharCode(x); return btoa(s); }" 2>&1 \
    | sed -n '/### Result/{n;p;}' | tr -d '"' | base64 -d > "att/$n/$NAME"
  [ -s "att/$n/$NAME" ] || { echo "FAIL: empty export for $n"; exit 1; }
done
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
echo "audits.json: $PT -> $CT; exports att/<store>/$NAME"

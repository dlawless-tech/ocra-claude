#!/bin/bash
# Pull every Uber pay period from START to END for each store, one JSON array per store, into <out.json>.
# usage: uber-pull.sh <session> <START YYYY-MM-DD> <END YYYY-MM-DD> <out.json>
set -u
S=$1; START=$2; END=$3; OUT=$4; HERE="$(cd "$(dirname "$0")" && pwd)"
res() { sed -n '/### Result/{n;p;}'; }
echo "[]" > "$OUT"
for pair in "MX|614 Washington" "SLU|374 S Grand" "Skinker|360 N Skinker" "Page|11512 Page" "Fenton|870 South Highway" "Kirkwood|10935 Manchester" "Spirit|17726 Chesterfield"; do
  T=${pair%%|*}; A=${pair#*|}
  playwright-cli -s=$S goto https://merchants.ubereats.com/manager/payments >/dev/null 2>&1; sleep 8
  playwright-cli -s=$S click 'button:text-is("Ok got it")' >/dev/null 2>&1
  playwright-cli -s=$S click '#store-selector-trigger' >/dev/null 2>&1; sleep 2
  playwright-cli -s=$S eval "() => { const b=Array.from(document.querySelectorAll('button')).find(b=>b.id!=='store-selector-trigger' && b.innerText.includes('$A')); if(!b) return 'none'; b.click(); return 'ok' }" >/dev/null 2>&1
  playwright-cli -s=$S click 'button:text-is("Apply")' >/dev/null 2>&1; sleep 8
  N=$(playwright-cli -s=$S requests 2>&1 | grep listPayoutsHistory | tail -1 | cut -d. -f1)
  ORG=$(playwright-cli -s=$S request-body $N 2>&1 | tail -1 | grep -oE '"orgUUIDs":\["[^"]+' | cut -d'"' -f4)
  [ -n "$ORG" ] || { echo "FAIL: no org for $T"; exit 1; }
  sed -e "s/__START__/$START/" -e "s/__END__/$END/" -e "s/__ORG__/$ORG/" -e "s/__STORE__/$T/" "$(dirname "$0")/uber-fetch.js" > "$(dirname "$OUT")/uf.run.js"
  playwright-cli -s=$S eval "$(cat "$(dirname "$OUT")/uf.run.js")" 2>&1 | res | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let v=JSON.parse(s);if(typeof v==="string")v=JSON.parse(v);const f=process.argv[1];const a=JSON.parse(require("fs").readFileSync(f,"utf8"));require("fs").writeFileSync(f,JSON.stringify(a.concat(v)));console.log(process.argv[2],v.length,v.slice(0,2).map(x=>x.end+" "+x.net).join(" | "))})' "$OUT" "$T"
done

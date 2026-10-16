#!/bin/bash
# Pull each store's Uber pay periods ending START..END, with each period's earnings breakdown, into <out.json>.
# Uber answers for the store picked in the page, so each store is picked first.
# usage: uber-pull.sh <session> <START YYYY-MM-DD> <END YYYY-MM-DD> <out.json>   [STORE=<tag> keeps one store]
set -u
S=$1; START=$2; END=$3; OUT=$4; HERE="$(cd "$(dirname "$0")" && pwd)"; W="$(dirname "$OUT")"
res() { sed -n '/### Result/{n;p;}'; }
echo "[]" > "$OUT"
for pair in "MX|614 Washington" "SLU|374 S Grand" "Skinker|360 N Skinker" "Page|11512 Page" "Fenton|870 South Highway" "Kirkwood|10935 Manchester" "Spirit|17726 Chesterfield"; do
  T=${pair%%|*}; A=${pair#*|}
  [ -n "${STORE:-}" ] && [ "$STORE" != "$T" ] && continue
  ORG=
  for try in 1 2; do
    playwright-cli -s=$S goto https://merchants.ubereats.com/manager/payments >/dev/null 2>&1; sleep 8
    playwright-cli -s=$S click 'button:text-is("Ok got it")' >/dev/null 2>&1
    playwright-cli -s=$S click '#store-selector-trigger' >/dev/null 2>&1; sleep 2
    playwright-cli -s=$S eval "() => { const b=Array.from(document.querySelectorAll('button')).find(b=>b.id!=='store-selector-trigger' && b.innerText.includes('$A')); if(!b) return 'none'; b.click(); return 'ok' }" >/dev/null 2>&1
    playwright-cli -s=$S click 'button:text-is("Apply")' >/dev/null 2>&1; sleep 8
    N=$(playwright-cli -s=$S requests 2>&1 | grep listPayoutsHistory | tail -1 | cut -d. -f1)
    [ -n "$N" ] && ORG=$(playwright-cli -s=$S request-body $N 2>&1 | tail -1 | grep -oE '"orgUUIDs":\["[^"]+' | cut -d'"' -f4)
    RU=$(playwright-cli -s=$S eval "() => new URLSearchParams(location.search).get('restaurantUUID')" 2>&1 | res | tr -d '"')
    [ -n "$ORG" ] && break
  done
  [ -n "$ORG" ] || { echo "FAIL: could not pick $T in Uber"; exit 1; }
  sed -e "s/__START__/$START/" -e "s/__END__/$END/" -e "s/__ORG__/$ORG/" -e "s/__STORE__/$T/" -e "s/__RU__/$RU/" "$HERE/uber-fetch.js" > "$W/uf.run.js"
  playwright-cli -s=$S eval "$(cat "$W/uf.run.js")" 2>&1 | res | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let v=JSON.parse(s);if(typeof v==="string")v=JSON.parse(v);const f=process.argv[1];const a=JSON.parse(require("fs").readFileSync(f,"utf8"));require("fs").writeFileSync(f,JSON.stringify(a.concat(v)));console.log(process.argv[2],v.length,"periods",v.map(x=>x.end+" "+x.net+(x.error?" ERROR":"")).slice(0,3).join(" | "))})' "$OUT" "$T" || { echo "FAIL: Uber read for $T"; exit 1; }
done

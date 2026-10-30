#!/bin/bash
# Pull one client's Uber pay periods ending FIRST..LAST: every store's breakdown into <work>/<client>/<store>.json,
# and each settled period's pay period page as a full-page PNG in <out>/<client folder>/WE <end>/.
# Session uwp-<client> must be logged in (uber-login.sh). Reruns skip PNGs already saved.
# usage: [STORE=<name fragment>] [OUT=<root>] pull.sh <client> <FIRST YYYY-MM-DD> <LAST YYYY-MM-DD>
set -u
C=$1; FIRST=$2; LAST=$3; S=uwp-$C
HERE="$(cd "$(dirname "$0")" && pwd)"
DEF="C:/Users/trici/OCRA/TML's Files - General/UberEats"; OUT="${OUT:-$DEF}"
FOLDER=$(node -e 'console.log(require(process.argv[1])[process.argv[2]].folder)' "$(cygpath -m "$HERE/clients.json")" "$C") || { echo "FAIL: no client $C in clients.json"; exit 1; }
W="$PWD/$C"; mkdir -p "$W"
res() { sed -n '/### Result/{n;p;}'; }
pw() { playwright-cli -s=$S "$@" 2>&1; }
# deposit-date filter: a week back from FIRST through today
DFROM=$(date -d "$FIRST -7 days" +%F); DTO=$(date +%F)

# stores from the picker, so new or closed stores follow Uber
pw goto https://merchants.ubereats.com/manager/payments >/dev/null; sleep 9
pw click 'button:text-is("Ok got it")' >/dev/null; pw click '#store-selector-trigger' >/dev/null; sleep 3
pw eval "() => JSON.stringify([...document.querySelectorAll('input[name=store-selector-stores]')].map(i=>{const p=i.closest('button').querySelectorAll('p');return {name:p[0].innerText.trim(),restaurant:i.value,address:p[1].innerText.trim()}}))" | res \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(JSON.parse(s));if(!v.length)process.exit(1);require("fs").writeFileSync(process.argv[1],JSON.stringify(v,null,1))})' "$W/stores.json" \
  || { echo "FAIL: store picker empty"; exit 1; }
echo "$C: $(node -e 'console.log(require(process.argv[1]).length)' "$(cygpath -m "$W/stores.json")") stores"

FAILS=0
while IFS=$'\t' read -r NAME RU; do
  [ -n "${STORE:-}" ] && [[ "$NAME" != *"$STORE"* ]] && continue
  ORG=; GOT=
  for try in 1 2 3; do
    pw goto "https://merchants.ubereats.com/manager/payments?restaurantUUID=$RU" >/dev/null; sleep 9
    pw click 'button:text-is("Ok got it")' >/dev/null
    GOT=$(pw eval "() => document.querySelector('#store-selector-trigger')?.innerText.trim()" | res | tr -d '"')
    N=$(pw requests | grep listPayoutsHistory | tail -1 | cut -d. -f1)
    [ -n "$N" ] && ORG=$(pw request-body $N | tail -1 | grep -oE '"orgUUIDs":\["[^"]+' | cut -d'"' -f4)
    [ -n "$ORG" ] && [ "$GOT" = "$NAME" ] && break; ORG=
  done
  [ -n "$ORG" ] || { echo "FAIL: $NAME could not be selected (page shows '$GOT')"; FAILS=$((FAILS+1)); continue; }
  sed -e "s/__DFROM__/$DFROM/" -e "s/__DTO__/$DTO/" -e "s/__FIRST__/$FIRST/" -e "s/__LAST__/$LAST/" -e "s/__ORG__/$ORG/" "$HERE/fetch.js" > "$W/fetch.run.js"
  F="$W/$RU.json"
  pw eval "$(cat "$W/fetch.run.js")" | res | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let v=JSON.parse(s);if(typeof v==="string")v=JSON.parse(v);
      if(v.error){console.log("FAIL:",v.error);process.exit(1)}
      const [f,name,ru,org]=process.argv.slice(1);require("fs").writeFileSync(f,JSON.stringify({store:name,restaurant:ru,org,periods:v},null,1));
      console.log(name+":",v.length,"periods",v.map(p=>p.end+" "+p.net+(p.status!=="SETTLED"?" "+p.status:"")+(p.error?" ERROR":"")).join(" | "))})' \
    "$(cygpath -m "$F")" "$NAME" "$RU" "$ORG" || { echo "FAIL: $NAME data read"; FAILS=$((FAILS+1)); continue; }

  # one PNG per settled period
  while IFS=$'\t' read -r ST EN SE NET; do
    DIR="$OUT/$FOLDER/WE $EN"; mkdir -p "$DIR"
    SAFE=$(printf '%s' "$NAME" | tr '\\/:*?"<>|' '---------' | tr -s ' -')
    P="$DIR/$SAFE UberEats $ST to $EN.png"
    [ -s "$P" ] && continue
    ok=
    for try in 1 2; do
      pw goto "https://merchants.ubereats.com/manager/payments/pay-period?restaurantUUID=$RU&dateRange=custom&start=$ST&end=$EN&settlement=$SE" >/dev/null; sleep 12
      pw click 'button:text-is("Ok got it")' >/dev/null; pw click 'text=Expand all' >/dev/null; sleep 3
      PAY=none
      for i in 1 2 3 4 5; do
        PAY=$(pw eval "() => { const m = document.body.innerText.match(/Total payout\s*\n\s*(-?)\x24?([\d,]+\.\d\d)/); return m ? m[1] + m[2].replace(/,/g,'') : 'none'; }" | res | tr -d '"')
        [ "$PAY" != none ] && break; sleep 5; pw click 'text=Expand all' >/dev/null
      done
      node -e 'process.exit(Math.abs(+process.argv[1] - +process.argv[2]) < 0.005 ? 0 : 1)' "$PAY" "$NET" && { ok=1; break; }
    done
    [ -n "$ok" ] || { echo "FAIL: $NAME $EN page Total payout $PAY, data $NET"; FAILS=$((FAILS+1)); continue; }
    PJ=$(node -e 'console.log(JSON.stringify(process.argv[1]).replace(/\x27/g,"\\u0027"))' "$(cygpath -m "$P")")
    grep -v '^//' "$HERE/capture.js" | sed "s|SHOTPATH|$(printf '%s' "$PJ" | sed 's/[&|\\]/\\&/g')|" > "$W/capture.run.js"
    H=$(pw run-code "$(cat "$W/capture.run.js")" | res | tr -d '"')
    # a page cut at the window means the unclip missed: drop it so a rerun retries
    if [ -s "$P" ] && [ "${H:-0}" -gt 1200 ] 2>/dev/null; then echo "  saved WE $EN/$(basename "$P")"
    else rm -f "$P"; echo "FAIL: $NAME $EN screenshot not written or cut off (height $H)"; FAILS=$((FAILS+1)); fi
  done < <(node -e 'for(const p of require(process.argv[1]).periods) if(p.status==="SETTLED"&&p.settlement&&!p.error) console.log([p.start,p.end,p.settlement,p.net].join("\t"))' "$(cygpath -m "$F")")
done < <(node -e 'for(const s of require(process.argv[1])) console.log(s.name+"\t"+s.restaurant)' "$(cygpath -m "$W/stores.json")")

node "$HERE/summarize.js" "$(cygpath -m "$W")" "$OUT/$FOLDER" "$FOLDER" || FAILS=$((FAILS+1))
echo "DONE $C fails=$FAILS"; [ $FAILS = 0 ]

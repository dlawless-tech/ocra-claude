#!/bin/bash
# Save every DoorDash payout dated in a window to a json file.
# usage: payouts.sh <session> <first payout date YYYY-MM-DD> <last payout date YYYY-MM-DD> <out.json>
set -u
S="$1"; A="$2"; B="$3"; OUT="$4"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# API lists an early-morning payout only from a window opening the day before; ask wide, keep payoutDate in A..B
JS=$(sed -e "s/START/$(date -d "$A - 1 day" +%F)T07:00:00.000Z/" -e "s/END/$(date -d "$B + 1 day" +%F)T06:59:59.999Z/" "$HERE/fetch-payouts.js")
playwright-cli -s=$S eval "$JS" 2>&1 | sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' \
  | node -e 'const s=require("fs").readFileSync(0,"utf8").trim(); let p; try{ p=JSON.parse(JSON.parse(s)); }catch(e){ console.error("FAIL: no payout json (logged out?): "+s.slice(0,200)); process.exit(1); }
    const ymd=x=>{const [m,d,y]=x.split("/").map(Number); return y*1e4+m*100+d;}, iso=x=>Number(x.replace(/-/g,""));
    p.summariesList=p.summariesList.filter(x=>ymd(x.payoutDate)>=iso(process.argv[2])&&ymd(x.payoutDate)<=iso(process.argv[3])); p.count=p.summariesList.length;
    require("fs").writeFileSync(process.argv[1], JSON.stringify(p,null,1)); const c={}; p.summariesList.forEach(x=>c[x.payoutDate]=(c[x.payoutDate]||0)+1); console.log(p.summariesList.length+" payouts", JSON.stringify(c));' "$OUT" "$A" "$B"

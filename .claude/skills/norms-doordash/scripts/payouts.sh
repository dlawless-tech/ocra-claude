#!/bin/bash
# Save every DoorDash payout dated in a window to a json file.
# usage: payouts.sh <session> <first payout date YYYY-MM-DD> <last payout date YYYY-MM-DD> <out.json>
set -u
S="$1"; A="$2"; B="$3"; OUT="$4"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JS=$(sed -e "s/START/${A}T07:00:00.000Z/" -e "s/END/$(date -d "$B + 1 day" +%F)T06:59:59.999Z/" "$HERE/fetch-payouts.js")
playwright-cli -s=$S eval "$JS" 2>&1 | sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' \
  | node -e 'const s=require("fs").readFileSync(0,"utf8").trim(); let p; try{ p=JSON.parse(JSON.parse(s)); }catch(e){ console.error("FAIL: no payout json (logged out?): "+s.slice(0,200)); process.exit(1); }
    require("fs").writeFileSync(process.argv[1], JSON.stringify(p,null,1)); const c={}; p.summariesList.forEach(x=>c[x.payoutDate]=(c[x.payoutDate]||0)+1); console.log(p.summariesList.length+" payouts", JSON.stringify(c));' "$OUT"

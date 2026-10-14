#!/bin/bash
# Print a paid payout's detail header and tiles: covered window, Net total, Sales, Commission & fees, Marketing spend, Amendments.
# usage: dd-payout.sh <session> <payout id>   (from Financials > Payouts, last 30 days)
set -u
S=$1; ID=$2
res() { sed -n '/### Result/{n;p}'; }
playwright-cli -s $S eval "() => { const p=document.querySelector('[data-testid=entry-point-popover] button'); if(p) p.click(); return 1; }" >/dev/null 2>&1
# the list cell refuses a real click (never stable); a DOM click opens it
R=$(playwright-cli -s $S eval "() => { const b=[...document.querySelectorAll('[data-testid=BMAPayoutListCell]')].find(x=>x.innerText.includes('$ID')); if(!b) return 'none'; b.scrollIntoView(); b.click(); return 'ok'; }" 2>&1 | res)
case "$R" in *ok*) : ;; *) echo "FAIL: payout $ID not on the list (open Financials > Payouts first)"; exit 1;; esac
sleep 8
playwright-cli -s $S eval "() => document.body.innerText" 2>&1 | res | node -e 'const t=JSON.parse(require("fs").readFileSync(0,"utf8"));const i=t.indexOf("Payout #");if(i<0){console.log("FAIL: detail did not open");process.exit(1)}const s=t.slice(i);console.log(s.slice(0,s.indexOf("Transactions\n")+12).replace(/\n/g," | "))'
playwright-cli -s $S go-back >/dev/null 2>&1; sleep 5

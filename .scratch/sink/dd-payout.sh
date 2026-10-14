#!/bin/bash
# usage: dd-payout.sh <payoutId|card text regex>  -> prints detail header + tiles
S=sdd; K="$1"
res() { sed -n '/### Result/{n;p}'; }
for i in 1 2 3; do playwright-cli -s $S snapshot >/dev/null 2>&1; f=$(ls -t .playwright-cli/page-*.yml | head -1)
  R=$(grep -E "button \"[^\"]*$K" "$f" | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2); [ -n "$R" ] && break
  B=$(grep -E 'button "Payouts"' "$f" | grep -oE 'ref=[a-z0-9]+' | tail -1 | cut -d= -f2); [ -n "$B" ] && playwright-cli -s $S click $B >/dev/null 2>&1; sleep 6; done
[ -n "$R" ] || { echo "FAIL no row $K"; exit 1; }
playwright-cli -s $S click $R >/dev/null 2>&1; sleep 8
playwright-cli -s $S eval "() => document.body.innerText" 2>&1 | res | node -e 'const t=JSON.parse(require("fs").readFileSync(0,"utf8"));const i=Math.max(t.indexOf("Payout #"),t.indexOf("Net total")-300);const s=t.slice(i);console.log(s.slice(0,s.indexOf("Transactions\n")+12).replace(/\n/g," | "))'

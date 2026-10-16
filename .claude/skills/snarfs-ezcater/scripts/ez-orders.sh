#!/bin/bash
# Pull every EZ Cater order between two Central dates into a json file.
# usage: ez-orders.sh <session> <start YYYY-MM-DD> <end YYYY-MM-DD> <out.json>
set -u
S=$1; A=$2; B=$3; OUT=$4
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Central midnight bounds; the API wants UTC
SA=$(node -e "console.log(new Date('$A'+'T00:00:00-05:00').toISOString())"); SB=$(node -e "console.log(new Date('$B'+'T23:59:59-05:00').toISOString())")
case "$(playwright-cli -s=$S eval '() => location.host' 2>&1 | sed -n '/### Result/,/### Ran/p' | sed '1d;$d' | tr -d '"\n')" in partnerportal.ezcater.com) ;; *) echo "FAIL: $S is not on the Partner Portal"; exit 1;; esac
sed -e "s/__S__/$SA/g" -e "s/__E__/$SB/g" "$HERE/orders.js" > "$OUT.js"
R=$(playwright-cli -s=$S eval "$(cat "$OUT.js")" 2>&1 | sed -n '/### Result/,/### Ran/p' | sed '1d;$d'); rm -f "$OUT.js"
echo "$R" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s);if(!v.startsWith("["))throw new Error(v);const a=JSON.parse(v);require("fs").writeFileSync(process.argv[1],JSON.stringify(a,null,1));console.log(a.length+" orders -> "+process.argv[1])})' "$OUT" || { echo "FAIL: orders"; exit 1; }

#!/bin/bash
# Download every Foodja statement whose Through Date is <end> and parse each into <out>/statements.json.
# usage: statements.sh <session> <end M/D/YYYY> <out dir>
# PDFs land in <out>/statements/ under Foodja's own file name. No statement for <end> prints "none" and writes [].
set -u
S=$1; END=$2; OUT=$3
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
mkdir -p "$OUT/statements"
THRU=$(echo "$END" | awk -F/ '{printf "%02d/%02d/%s", $1, $2, $3}')
playwright-cli -s=$S goto https://foodja.com/restaurant-portal/accounting/statements/ >/dev/null 2>&1; sleep 6
# the default search reaches back one year; Show All lifts the 20-row page
playwright-cli -s=$S select 'select[name$="_length"]' All >/dev/null 2>&1; sleep 2
LIST=$(playwright-cli -s=$S eval "() => JSON.stringify(Array.from(document.querySelectorAll('table tbody tr')).filter(r => r.cells.length > 2 && r.cells[2].innerText.trim() === '$THRU').map(r => { const a = r.querySelector('a'); return { name: a.innerText.trim(), url: a.href }; }))" 2>&1 | res)
LIST=$(node -e 'let s=JSON.parse(process.argv[1]);if(typeof s==="string")s=JSON.parse(s);console.log(JSON.stringify(s))' "$LIST") || { echo "FAIL: statement list unreadable"; exit 1; }
N=$(node -e 'console.log(JSON.parse(process.argv[1]).length)' "$LIST")
[ "$N" -gt 0 ] || { echo "none for $THRU"; echo '[]' > "$OUT/statements.json"; exit 0; }
for i in $(seq 0 $((N - 1))); do
  NAME=$(node -e 'console.log(JSON.parse(process.argv[1])[process.argv[2]].name.replace(/\s+/g," "))' "$LIST" $i)
  URL=$(node -e 'console.log(JSON.parse(process.argv[1])[process.argv[2]].url)' "$LIST" $i)
  # the PDF sits behind the portal's cookie, so fetch it inside the page
  B=$(playwright-cli -s=$S eval "async () => { const r = await fetch('$URL'); const b = new Uint8Array(await r.arrayBuffer()); let s = ''; for (const c of b) s += String.fromCharCode(c); return r.headers.get('content-type') + '|' + btoa(s); }" 2>&1 | res | tr -d '"')
  case "$B" in application/pdf\|*) echo "${B#*|}" | base64 -d > "$OUT/statements/$NAME";; *) echo "FAIL: $NAME did not download"; exit 1;; esac
  echo "downloaded $NAME"
done
node "$HERE/parse-statements.js" "$OUT/statements" > "$OUT/statements.json" || exit 1
node -e 'for(const s of require(process.argv[1]))console.log(s.code.padEnd(11),s.store.padEnd(26),"sales",s.total.toFixed(2).padStart(9),"due",s.due.toFixed(2).padStart(9),"orders",s.orders.length)' "$(cd "$OUT" && pwd)/statements.json"

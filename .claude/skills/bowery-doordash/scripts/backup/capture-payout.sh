#!/bin/bash
# Capture one payout's header and summary tiles from the DoorDash portal, cropped above the transaction list.
# usage: capture-payout.sh <payout id> <out.png>
# Runs in the default DoorDash session, starting from the Payouts list or any payout detail.
# Prints the detail header, so the covered window is read in the same step.
ID="$1"; OUT="$2"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
res() { sed -n '/### Result/,/### Ran/p' | sed -n 2p; }
hdr() { playwright-cli eval "() => (document.body.innerText.match(/Payout #\d+ for transactions[^\n]*/)||['LIST'])[0]" 2>&1 | res; }
playwright-cli resize 1800 1000 >/dev/null 2>&1
H=$(hdr)
if ! echo "$H" | grep -q "#$ID "; then
  bash "$HERE/../snapshot.sh" "" snap.dd.txt
  # a detail is open: only the breadcrumb leads back, and its ref changes every render
  if echo "$H" | grep -q 'Payout #'; then
    B=$(grep -oE 'button "Payouts" \[ref=[a-z0-9]+\]' snap.dd.txt | tail -1 | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
    playwright-cli click "$B" >/dev/null 2>&1; sleep 8; bash "$HERE/../snapshot.sh" "" snap.dd.txt
  fi
  R=$(grep -oE "cell \"$ID\" \[ref=[a-z0-9]+\]" snap.dd.txt | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
  [ -n "$R" ] || { echo "FAIL: payout $ID not in the list"; exit 1; }
  playwright-cli click "$R" >/dev/null 2>&1; sleep 8
  H=$(hdr)
fi
echo "$H" | grep -q "#$ID " || { echo "FAIL: detail did not open: $H"; exit 1; }
mkdir -p "$(dirname "$OUT")"
P=$(node -e 'console.log(JSON.stringify(process.argv[1]))' "$OUT")
# hide the Qualtrics survey popup, which lands over the tiles on some loads
playwright-cli eval "() => { document.querySelectorAll('[class*=QSI],[id*=QSI]').forEach(e=>e.style.display='none'); [...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).position==='fixed'&&/Survey Completion/.test(e.innerText||'')).forEach(e=>e.style.display='none'); }" >/dev/null 2>&1
Y=$(playwright-cli run-code "async page => { const y = await page.evaluate(() => { const h=[...document.querySelectorAll('h1,h2,h3,div,span')].find(e=>/^\d+ Transactions$/.test(e.innerText.trim())); return h ? Math.round(h.getBoundingClientRect().top - 12) : 0; }); if (y < 300) return 'ERR-noanchor'; await page.screenshot({path:$P, clip:{x:0,y:0,width:1800,height:y}}); return y; }" 2>&1 | res)
[ -s "$OUT" ] || { echo "FAIL: no capture ($Y)"; exit 1; }
echo "$H"

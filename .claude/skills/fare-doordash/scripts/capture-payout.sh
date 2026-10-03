#!/bin/bash
# Screenshot one payout's detail page, header and summary tiles, cropped above the transaction list.
# usage: capture-payout.sh <session> <DoorDash Store ID> <payout id> <out.png>
# Prints the page header (payout id and covered window), then the tile text, one "label|amount" per line.
set -u
S="$1"; SID="$2"; PID="$3"; OUT="$4"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
playwright-cli -s=$S resize 1800 1000 >/dev/null 2>&1
playwright-cli -s=$S goto "https://merchant-portal.doordash.com/merchant/financials/payout-details/11521564/$SID/$PID?business_id=11521564" >/dev/null 2>&1
for i in 1 2 3 4 5 6; do sleep 5
  H=$(playwright-cli -s=$S eval "() => (document.body.innerText.match(/Payout #\d+ for transactions[^\n]*/)||[''])[0]" 2>&1 | res | tr -d '"')
  echo "$H" | grep -q "#$PID " && break
done
echo "$H" | grep -q "#$PID " || { echo "FAIL: payout $PID did not open"; exit 1; }
# assistant panel, survey popup and chat bubbles sit over the page
playwright-cli -s=$S eval "() => { document.querySelectorAll('[class*=QSI],[id*=QSI]').forEach(e=>e.style.display='none');
  [...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e);return (s.position==='fixed'||s.position==='absolute')&&/Survey Completion|Uses AI, may contain/.test(e.innerText||'')&&!/Payout #/.test(e.innerText||'')}).forEach(e=>e.style.display='none'); }" >/dev/null 2>&1
mkdir -p "$(dirname "$OUT")"
P=$(node -e 'console.log(JSON.stringify(require("path").resolve(process.argv[1])))' "$OUT")
Y=$(playwright-cli -s=$S run-code "async page => { const r = await page.evaluate(() => {
  const h=[...document.querySelectorAll('h1,h2,h3,div,span')].find(e=>/^\d+ Transactions?$/.test(e.innerText.trim()));
  const t=[...document.querySelectorAll('div,span,h1,h2')].find(e=>/^Payout on \w+ \d+, \d{4}$/.test((e.innerText||'').trim()));
  if(!h||!t) return null; const b=h.getBoundingClientRect();
  return {x:Math.max(0,Math.round(t.getBoundingClientRect().left-24)), y:Math.round(b.top-12)}; });
  if (!r || r.y < 300) return 'ERR-noanchor';
  await page.screenshot({path:$P, clip:{x:r.x,y:0,width:1800-r.x,height:r.y}}); return r.y; }" 2>&1 | res)
[ -s "$OUT" ] || { echo "FAIL: no capture ($Y)"; exit 1; }
echo "$H"
playwright-cli -s=$S eval "() => { const t=document.body.innerText; return ['Net total','Sales','Commission & fees','Marketing spend','Amendments'].map(k=>{ const m=t.match(new RegExp('\\\\n'+k+'\\\\n(?:Paid\\\\n|Pending\\\\n|Processing\\\\n)?(-?\\\\\$[0-9,.]+)')); return k+'|'+(m?m[1]:'?'); }).join('~'); }" 2>&1 | res | tr -d '"' | tr '~' '\n'

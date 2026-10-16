#!/bin/bash
# Save one store's Uber pay period page as a full-page PNG, "<M.D.YY> Snarfs <store> Ubereats.png" in <outdir>.
# Refuses unless the page's Total payout equals the plan's net (Uber adds late orders to a closed week).
# usage: capture-backup.sh <uber-session> <plan.json> <store> <outdir>    (outdir under the working directory)
set -u
S=$1; PLAN=$2; T=$3; DIR=$4
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
read -r RU ST EN SE NET < <(node -e 'const p=require(require("path").resolve(process.argv[1])).find(x=>x.store===process.argv[2]);if(!p||!p.settlement)process.exit(1);console.log(p.restaurant,p.start,p.end,p.settlement,p.net)' "$PLAN" "$T") || { echo "FAIL: no Uber period for $T in plan"; exit 1; }
mkdir -p "$DIR"
playwright-cli -s=$S goto "https://merchants.ubereats.com/manager/payments/pay-period?restaurantUUID=$RU&dateRange=custom&start=$ST&end=$EN&settlement=$SE" >/dev/null 2>&1; sleep 12
playwright-cli -s=$S click 'button:text-is("Ok got it")' >/dev/null 2>&1
playwright-cli -s=$S click 'text=Expand all' >/dev/null 2>&1; sleep 3
for i in 1 2 3 4 5 6; do
  GOT=$(playwright-cli -s=$S eval "() => { const m = document.body.innerText.match(/Total payout\s*\n\s*-?\x24?([\d,]+\.\d\d)/); return m ? m[1].replace(/,/g,'') : 'none'; }" 2>&1 | res)
  [ "$GOT" != none ] && break; sleep 5
  playwright-cli -s=$S click 'text=Expand all' >/dev/null 2>&1
done
node -e 'process.exit(Math.abs(+process.argv[1] - +process.argv[2]) < 0.005 ? 0 : 1)' "$GOT" "$NET" || { echo "FAIL: page Total payout $GOT, plan $NET"; exit 1; }
F="$DIR/$(node -e 'const [y,m,d]=process.argv[1].split("-");console.log(`${+m}.${+d}.${y.slice(2)}`)' "$EN") Snarfs $T Ubereats.png"
# hide the AI assistant popup and the floating Reviews tab, which cover the breakdown
playwright-cli -s=$S eval "() => { const h=Array.from(document.querySelectorAll('h5')).find(x=>/Chat with AI Assistant/.test(x.innerText)); let p=h; if(h){ while(p.parentElement && (p.parentElement.innerText||'').trim().startsWith('Chat with AI Assistant')) p=p.parentElement; p.style.display='none'; } for (const e of document.querySelectorAll('body *')) { const c=getComputedStyle(e); if ((c.position==='fixed'||c.position==='sticky') && e.getBoundingClientRect().top>80) e.style.display='none'; } return 1 }" >/dev/null 2>&1
FJ=$(node -e 'console.log(JSON.stringify(require("path").resolve(process.argv[1])).replace(/\x27/g,"\\u0027"))' "$F")
playwright-cli -s=$S run-code "async page => { await page.screenshot({path:$FJ, fullPage:true}); return 'ok'; }" >/dev/null 2>&1
[ -s "$F" ] || { echo "FAIL: screenshot not written"; exit 1; }
echo "SAVED $F"

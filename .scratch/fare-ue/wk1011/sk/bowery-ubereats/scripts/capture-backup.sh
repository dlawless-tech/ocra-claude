#!/bin/bash
# Save the Uber pay period page now showing as a full-page PNG backup.
# Refuses unless the page's Total payout equals the payout the entry was built on,
# which catches late orders Uber added after the read.
#
# Usage: capture-backup.sh <uber-session> <store-tag> <outdir> <period end YYYY-MM-DD> <payout>
#   store-tag is the ASCII fragment used everywhere else: Cookshop, Rosie, Shuka, Vic
#   outdir must sit under the working directory.
# Prints SAVED <path>, or FAIL.
set -u
S="$1"; T="$2"; D="$3"; END="$4"; P="$5"
mkdir -p "$D"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
GOT=$(playwright-cli -s=$S eval "() => { const m = document.body.innerText.match(/Total payout\s*\n\s*-?\\\$?([\d,]+\.\d\d)/); return m ? m[1].replace(/,/g,'') : 'none'; }" 2>&1 | res)
node -e 'process.exit(Math.abs(+process.argv[1] - +process.argv[2]) < 0.005 ? 0 : 1)' "$GOT" "$P" || { echo "FAIL: page Total payout $GOT, entry built on $P"; exit 1; }
F="$D/UberEats $T WE $END.png"
playwright-cli -s=$S run-code "async page => { await page.screenshot({path:'$F', fullPage:true}); return 'ok'; }" >/dev/null 2>&1
[ -s "$F" ] || { echo "FAIL: screenshot not written"; exit 1; }
echo "SAVED $F"

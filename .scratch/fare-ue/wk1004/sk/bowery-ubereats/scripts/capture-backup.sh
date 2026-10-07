#!/bin/bash
# Save the Uber Payouts page now showing as a full-page PNG backup, named from
# the pay period on the page. Checks the pay breakdown adds to Total payout first.
#
# Usage: capture-backup.sh <uber-session> <store-tag> <outdir>
#   store-tag is the ASCII fragment used everywhere else: Cookshop, Rosie, Shuka, Vic
#   outdir must sit under the working directory.
# Prints SAVED <path> and the breakdown, or FAIL.
set -u
S="$1"; T="$2"; D="$3"
mkdir -p "$D"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n' | sed 's/\\"/"/g; s/^"//; s/"$//'; }
B=$(playwright-cli -s=$S eval "() => { const n=s=>parseFloat(s.replace(/[\$,]/g,'')); const rows=Array.from(document.querySelectorAll('[role=treeitem]')).map(t=>(t.getAttribute('aria-label')||t.innerText).replace(/^(Right|Blank) /,'').replace(/\n/g,' ')); const m=(document.body.innerText.match(/Selected date range is from ([0-9/]+) to ([0-9/]+)/)||[]); let sum=0,tot=null; for(const r of rows){ const v=n(r.match(/-?\\\$[\d,]+\.\d\d/)[0]); if(/^Total payout/i.test(r)) tot=v; else sum+=v; } return JSON.stringify({end:m[2]||'', ok:tot!==null&&Math.abs(sum-tot)<0.005, rows}); }" 2>&1 | res)
END=$(echo "$B" | grep -oE '"end":"[0-9/]+"' | grep -oE '[0-9]+/[0-9]+/[0-9]+' | sed -E 's#([0-9]+)/([0-9]+)/([0-9]+)#\3-\1-\2#')
[ -n "$END" ] || { echo "FAIL: no pay period on page: $B"; exit 1; }
echo "$B" | grep -q '"ok":true' || { echo "FAIL: breakdown does not add to Total payout: $B"; exit 1; }
F="$D/UberEats $T WE $END.png"
playwright-cli -s=$S run-code "async page => { await page.screenshot({path:'$F', fullPage:true}); return 'ok'; }" >/dev/null 2>&1
[ -s "$F" ] || { echo "FAIL: screenshot not written"; exit 1; }
echo "SAVED $F $B"

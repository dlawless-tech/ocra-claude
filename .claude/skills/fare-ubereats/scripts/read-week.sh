#!/bin/bash
# Read every FARE store's Uber pay breakdown for one date range into week.txt.
# usage: read-week.sh <start YYYY-MM-DD> <end YYYY-MM-DD>   (default session, on Payments > Payouts)
# Saves each store's expanded page as backup/Uber <start>_<end>_<store>.pdf for the entry's attachment.
# Each block opens "== <store> | <uuid&range> | <store on page> | Selected date range ..." for build-lines.js to confirm.
set -u
A="$1"; B="$2"; D=$(dirname "$0"); SH="$D/../../bowery-ubereats/scripts/snapshot.sh"
res(){ sed -n '/### Result/{n;p}'; }
U=$(playwright-cli eval "() => location.href" 2>&1 | res | tr -d '"' | grep -oE 'restaurantUUID=[a-f0-9-]+')
playwright-cli goto "https://merchants.ubereats.com/manager/payments?$U&start=$A&end=$B&rangeType=1" >/dev/null 2>&1; sleep 12
: > week.txt; mkdir -p backup
while IFS= read -r n; do
  # picker rows take only a real click on the store name, by snapshot ref
  bash $SH "" u.txt; R=$(grep -m1 -E 'button "FARE' u.txt | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2); playwright-cli click $R >/dev/null 2>&1; sleep 3
  bash $SH "" u.txt; R=$(grep -F "generic [ref=" u.txt | grep -F "]: $n" | head -1 | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
  playwright-cli click $R >/dev/null 2>&1; sleep 1
  bash $SH "" u.txt; R=$(grep -m1 'button "Apply"' u.txt | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2); playwright-cli click $R >/dev/null 2>&1; sleep 12
  CHK=$(playwright-cli eval "() => location.href.split('restaurantUUID=')[1] + ' | ' + [...document.querySelectorAll('button')].map(b=>b.innerText).find(t=>/^FARE/.test(t)) + ' | ' + ([...document.querySelectorAll('p')].map(p=>p.innerText).find(t=>/Selected date range/.test(t))||'')" 2>&1 | res)
  { echo "== $n | $CHK"; bash "$D/expand-breakdown.sh"; } >> week.txt
  playwright-cli pdf --filename="backup/Uber ${A}_${B}_$(echo "$n" | tr -d "|.()" | tr -s " ").pdf" >/dev/null 2>&1
done < <(node -e 'console.log(Object.keys(require(process.argv[1])).join("\n"))' "$(cd "$D"; pwd -W 2>/dev/null || pwd)/stores.json")

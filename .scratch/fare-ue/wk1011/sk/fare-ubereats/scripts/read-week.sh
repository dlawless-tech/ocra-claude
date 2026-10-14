#!/bin/bash
# Read every FARE store's Uber Earnings breakdown for one date range into week.txt.
# usage: read-week.sh <start YYYY-MM-DD> <end YYYY-MM-DD>   (Uber session logged in)
# Saves each store's breakdown card as backup/Uber <start>_<end>_<store>.png for the backup page.
# Each block opens "== <store> | <uuid> | <store on page> | <range on page> | <Net sales>" for build-lines.js to confirm.
set -u; U=${UBER_SESSION:-fue-uber}
A="$1"; B="$2"; D=$(cd "$(dirname "$0")"; pwd); SH="$D/../../bowery-ubereats/scripts/snapshot.sh"
res(){ sed -n '/### Result/{n;p}'; }
echo "# $A $B" > week.txt; mkdir -p backup
while IFS=$'	' read -r n id; do
  playwright-cli -s=$U goto "https://merchants.ubereats.com/manager/payments/earnings?restaurantUUID=$id&start=$A&end=$B&rangeType=1" >/dev/null 2>&1; sleep 12
  bash $SH $U u.txt
  # first visit shows a what's-new modal
  R=$(grep -m1 'button "Ok got it"' u.txt | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
  [ -n "$R" ] && { playwright-cli -s=$U click $R >/dev/null 2>&1; sleep 2; bash $SH $U u.txt; }
  R=$(grep -m1 'button "Expand all' u.txt | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
  [ -n "$R" ] && { playwright-cli -s=$U click $R >/dev/null 2>&1; sleep 3; }
  T=$(playwright-cli -s=$U eval "$(cat "$D/read-tree.js")" 2>&1 | res | sed 's/^"//; s/"$//; s/\\n/\n/g')
  { echo "== $n | $id | ${T#@ }"; } | head -1 >> week.txt
  echo "$T" | tail -n +2 >> week.txt
  F="backup/Uber ${A}_${B}_$(echo "$n" | tr -d "|.()" | tr -s " ").png"
  # absolute: the daemon resolves relative paths from wherever the session was opened
  grep -v "^//" "$D/capture.js" | sed "s#SHOTPATH#$(cygpath -m "$PWD/$F")#" > capture.run.js
  playwright-cli -s=$U run-code "$(cat capture.run.js)" 2>&1 | res | grep -q ok || echo "FAIL: no screenshot for $n" >&2
done < <(node -e 'const u=require(process.argv[1]);for(const k in u)console.log(k+"	"+u[k])' "$(cd "$D"; pwd -W 2>/dev/null || pwd)/uuids.json")

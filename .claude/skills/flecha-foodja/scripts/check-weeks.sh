#!/bin/bash
# Read back every posted store-week in lines.json against its row. Changes nothing.
# usage: check-weeks.sh <session> <lines.json> <ids.txt>
# Prints MATCH, DIFF (with the posted and the actual fee), MISSING (row with no posted entry) or SKIP per row.
set -u
S="$1"; L="$2"; IDS="$3"; D=$(dirname "$0")
node -e 'require(require("path").resolve(process.argv[1])).forEach(x=>console.log(x.weekEnding+"|"+x.loc+"|"+(x.skip||"")+"|"+(x.fee??"")))' "$L" | while IFS='|' read -r WE LOC SKIP FEE; do
  [ -n "$SKIP" ] && { echo "SKIP: $WE $LOC $SKIP"; continue; }
  HAVE=$(grep "^$WE|$LOC|" "$IDS" | tail -1 | cut -d'|' -f3)
  [ -n "$HAVE" ] || { echo "MISSING: $WE $LOC actual $FEE"; continue; }
  C=$(bash "$D/check-entry.sh" $S "$L" "$WE" "$LOC" "$HAVE" < /dev/null)
  echo "$C" | grep -q '^MATCH ' && { echo "$C"; continue; }
  echo "DIFF: $WE $LOC $HAVE actual $FEE; $C"
done

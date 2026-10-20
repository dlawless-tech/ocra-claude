#!/bin/bash
# Post every store-week in lines.json that is not in ids.txt yet, approved. A posted week is left as it is.
# usage: run-weeks.sh <session> <lines.json> <sources.txt> <ids.txt>
# sources.txt: one "<location>|<TransactionId>" per store, its latest Foodja entry (an Uber Eats entry the first time).
# ids.txt: "<Sunday>|<location>|<id>" for every entry approved, appended by this script.
set -u
S="$1"; L="$2"; SRC="$3"; IDS="$4"
D=$(dirname "$0"); touch "$IDS"
node -e 'require(require("path").resolve(process.argv[1])).forEach(x=>console.log(x.weekEnding+"|"+x.loc))' "$L" | while IFS='|' read -r WE LOC; do
  # extra tabs from an earlier copy would be taken for this one's copy tab
  while playwright-cli -s=$S tab-list 2>&1 | grep -qE '^- 1:'; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
  HAVE=$(grep "^$WE|$LOC|" "$IDS" | tail -1 | cut -d'|' -f3)
  [ -n "$HAVE" ] && { echo "posted $WE $LOC $HAVE (left as is)"; continue; }
  # latest entry for this store: this run's ids first, then sources.txt
  FROM=$(grep "|$LOC|" "$IDS" | tail -1 | cut -d'|' -f3); [ -n "$FROM" ] || FROM=$(grep "^$LOC|" "$SRC" | cut -d'|' -f2)
  [ -n "$FROM" ] || { echo "FAIL: no source for $LOC"; continue; }
  OUT=$(bash "$D/post-entry.sh" $S "$L" "$WE" "$LOC" "$FROM" < /dev/null); echo "$OUT"
  ID=$(echo "$OUT" | sed -n 's/^id //p')
  echo "$OUT" | grep -q '^MATCH ' || { echo "FAIL: $WE $LOC left unapproved ${ID:-no copy}"; continue; }
  bash "$D/../../flecha-doordash/scripts/approve.sh" $S "$ID" < /dev/null && echo "$WE|$LOC|$ID" >> "$IDS"
done

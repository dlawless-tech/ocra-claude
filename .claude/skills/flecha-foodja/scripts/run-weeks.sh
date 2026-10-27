#!/bin/bash
# Bring every store-week in lines.json to its row, approved. A store-week already in ids.txt is checked and, when it
# differs (a statement or a DSS change since), unapproved, refilled and approved again. A new store-week duplicates
# the store's latest entry. A row with "skip" posts nothing.
# usage: run-weeks.sh <session> <lines.json> <sources.txt> <ids.txt>
# sources.txt: one "<location>|<TransactionId>" per store, its latest Foodja entry (an Uber Eats entry the first time).
# ids.txt: "<Sunday>|<location>|<id>" for every entry approved, appended by this script.
set -u
S="$1"; L="$2"; SRC="$3"; IDS="$4"
D=$(dirname "$0"); touch "$IDS"
node -e 'require(require("path").resolve(process.argv[1])).forEach(x=>console.log(x.weekEnding+"|"+x.loc+"|"+(x.skip||"")))' "$L" | while IFS='|' read -r WE LOC SKIP; do
  [ -n "$SKIP" ] && { echo "SKIP: $WE $LOC $SKIP"; continue; }
  # extra tabs from an earlier copy would be taken for this one's copy tab
  while playwright-cli -s=$S tab-list 2>&1 | grep -qE '^- 1:'; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
  HAVE=$(grep "^$WE|$LOC|" "$IDS" | tail -1 | cut -d'|' -f3)
  if [ -n "$HAVE" ]; then
    C=$(bash "$D/check-entry.sh" $S "$L" "$WE" "$LOC" "$HAVE" < /dev/null)
    echo "$C" | grep -q '^MATCH ' && { echo "$C (unchanged)"; continue; }
    echo "correct: $C"
    bash "$D/../../flecha-doordash/scripts/unapprove.sh" $S "$HAVE" "$WE" "$LOC" < /dev/null || { echo "FAIL: $WE $LOC $HAVE did not unapprove"; continue; }
    OUT=$(REDO="$HAVE" bash "$D/post-entry.sh" $S "$L" "$WE" "$LOC" x < /dev/null); echo "$OUT"
    echo "$OUT" | grep -q '^MATCH ' || { echo "FAIL: $WE $LOC left unapproved $HAVE"; continue; }
    bash "$D/../../flecha-doordash/scripts/approve.sh" $S "$HAVE" < /dev/null || echo "FAIL: $WE $LOC left unapproved $HAVE"
    continue
  fi
  # latest entry for this store: this run's ids first, then sources.txt
  FROM=$(grep "|$LOC|" "$IDS" | tail -1 | cut -d'|' -f3); [ -n "$FROM" ] || FROM=$(grep "^$LOC|" "$SRC" | cut -d'|' -f2)
  [ -n "$FROM" ] || { echo "FAIL: no source for $LOC"; continue; }
  OUT=$(bash "$D/post-entry.sh" $S "$L" "$WE" "$LOC" "$FROM" < /dev/null); echo "$OUT"
  ID=$(echo "$OUT" | sed -n 's/^id //p')
  echo "$OUT" | grep -q '^MATCH ' || { echo "FAIL: $WE $LOC left unapproved ${ID:-no copy}"; continue; }
  bash "$D/../../flecha-doordash/scripts/approve.sh" $S "$ID" < /dev/null && echo "$WE|$LOC|$ID" >> "$IDS"
done

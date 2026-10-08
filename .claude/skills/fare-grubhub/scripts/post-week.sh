#!/bin/bash
# Post every store for one week, closing extra tabs between stores.
# usage: post-week.sh <r365 session> <lines.json> <prior ids.txt> <out ids.txt>
# Writes "store|TransactionId" for each store that reads MATCH or no sales; prints DONE or FAILED per store.
P="$(dirname "$0")/post-store.sh"; S=$1
: > "$4"
while IFS='|' read -r ST SRC; do
  echo "##### $ST"
  OUT=$(timeout 420 bash "$P" $S "$2" "$ST" "$SRC" 2>&1 | grep -v -E '^(╔|║|╚)' | cut -c1-300)
  echo "$OUT"
  ID=$(echo "$OUT" | sed -n 's/^id //p' | head -1)
  OK=$(echo "$OUT" | grep -cE '^MATCH|no sales this week')
  if [ -n "$ID" ] && [ "$OK" -gt 0 ]; then echo "$ST|$ID" >> "$4"; echo "DONE $ST $ID"; else echo "FAILED $ST ${ID:-no id}"; fi
  while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 0 >/dev/null 2>&1; done
done < "$3"

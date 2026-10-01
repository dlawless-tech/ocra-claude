#!/bin/bash
# post every store for one week. usage: run-week.sh <lines.json> <prev ids> <out ids>
P=../../.claude/skills/fare-grubhub/scripts/post-store.sh
: > "$3"
while IFS='|' read -r ST SRC; do
  echo "##### $ST"
  OUT=$(timeout 420 bash $P fghr "$1" "$ST" "$SRC" 2>&1 | grep -v -E '^(╔|║|╚)' | cut -c1-300)
  echo "$OUT"
  ID=$(echo "$OUT" | sed -n 's/^id //p' | head -1)
  OK=$(echo "$OUT" | grep -cE '^MATCH|no sales this week')
  if [ -n "$ID" ] && [ "$OK" -gt 0 ]; then echo "$ST|$ID" >> "$3"; echo "DONE $ST $ID"; else echo "FAILED $ST ${ID:-no id}"; fi
  while [ "$(playwright-cli -s=fghr tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=fghr tab-close 0 >/dev/null 2>&1; done
done < "$2"

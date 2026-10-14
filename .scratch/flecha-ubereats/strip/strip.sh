#!/bin/bash
# usage: strip.sh <session> <id>...   unapprove, drop 1235, refill, approve
S="$1"; shift; SK=/c/Users/trici/ocra-claude/.claude/skills; HOST=https://flecha.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
for ID in "$@"; do
  while playwright-cli -s=$S tab-list 2>&1 | grep -qE '^- 1:'; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
  bash $SK/flecha-doordash/scripts/unapprove.sh $S $ID < /dev/null || { echo "FAIL unapprove $ID"; continue; }
  playwright-cli -s=$S goto "$HOST/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
  playwright-cli -s=$S eval "$(cat read.js)" > before-$ID.txt 2>&1
  node strip.js before-$ID.txt > week-$ID.json; R=$?; [ $R = 0 ] && node addmeta.js week-$ID.json
  [ $R = 2 ] && { echo "$ID no 1235 lines"; bash $SK/flecha-doordash/scripts/approve.sh $S $ID < /dev/null; continue; }
  [ $R = 0 ] || { echo "FAIL strip $ID left unapproved"; continue; }
  OUT=$(REDO=$ID bash $SK/flecha-3rd-party/scripts/post-week.sh $S week-$ID.json x < /dev/null); echo "$OUT"
  echo "$OUT" | grep -q '^MATCH' || { echo "FAIL $ID left unapproved"; continue; }
  bash $SK/flecha-doordash/scripts/approve.sh $S $ID < /dev/null && echo "DONE $ID"
done

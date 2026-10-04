#!/bin/bash
S=$1; IN=$2; OUT=$3; : > $OUT
while IFS='|' read -r D L ID; do
  for t in 1 2 3; do
    playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 11
    R=$(playwright-cli -s=$S eval "$(cat read-entry.js)" 2>&1 | sed -n '/### Result/,/### Ran/p' | sed '1d;$d' | tr -d '\n')
    case "$R" in *lines*) break;; esac
  done
  echo "$D|$L|$ID|$R" >> $OUT
done < $IN
echo done

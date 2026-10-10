#!/bin/bash
# run from .scratch/bowery-cc-rec
while IFS='|' read AMT PAYEE MEMO GL; do
  grep -qF "|$MEMO|id " shuka/posted.log 2>/dev/null && continue
  R=$(bash shuka/post-sh.sh sh 08/31/2026 CC "$AMT" "$PAYEE" "$MEMO" "$GL" "$MEMO" 2>&1 < /dev/null)
  ID=$(echo "$R" | grep -oE '^id .*')
  L=$(echo "$R" | tail -1 | grep -oE 'lines.*' | head -c 120)
  echo "$AMT|$MEMO|$ID|$L" >> shuka/posted.log
done < shuka/entries.txt
echo END >> shuka/posted.log

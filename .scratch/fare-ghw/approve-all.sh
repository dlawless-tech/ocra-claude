#!/bin/bash
# approve every weekly GrubHub entry listed in the ids files
A=../../.claude/skills/fare-ubereats/scripts/approve.sh
for f in ids0906.txt ids0913.txt ids0920.txt ids0927.txt; do
  while IFS='|' read -r ST ID; do
    R=$(timeout 200 bash $A fghr "$ID" 2>&1 | tail -1)
    echo "$f $ST $R"
  done < "$f"
done

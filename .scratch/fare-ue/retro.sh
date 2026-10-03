#!/bin/bash
# backfill: per week dir, read Uber, then build+attach per store from that week's ids file
D=/c/Users/trici/ocra-claude/.claude/skills/fare-ubereats/scripts
for W in "2026-09-01 2026-09-06 09-06" "2026-09-07 2026-09-13 09-13" "2026-09-14 2026-09-20 09-20" "2026-09-21 2026-09-27 09-27"; do
  set -- $W; DIR=/c/Users/trici/ocra-claude/.scratch/fare-ue/wk${3/-/}; mkdir -p $DIR; cd $DIR
  echo "##### week $1 to $2"
  bash $D/read-week.sh $1 $2
  while IFS= read -r L; do
    ST=${L%|*}; ID=${L##*|}
    [ "$3" = 09-27 ] && [ "$ST" = "FARE (Lakeview)" ] && { echo "FARE (Lakeview)	skipped, attached earlier"; continue; }
    bash $D/backup-store.sh fue-r365 "$ID" "$ST" 2>&1 | grep -E 'ties|TIE|attached|FAIL|STOP'
  done < /c/Users/trici/ocra-claude/.scratch/fare-ue/ids-2026-$3.txt
done
echo DONE

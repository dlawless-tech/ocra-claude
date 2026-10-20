#!/bin/bash
cd /c/Users/trici/ocra-claude
W=.scratch/norms-ubereats/wk1017; S=$1
while IFS= read -r L; do [ -z "$L" ] && continue; ENTRY_DATE=10/17/2026 bash .claude/skills/norms-ubereats/scripts/edit-entry.sh $S "$L" $W/work.json; done < $W/list-$S.txt >> $W/post-$S.log 2>&1
echo BATCHDONE >> $W/post-$S.log

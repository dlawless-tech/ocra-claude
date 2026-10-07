#!/bin/bash
S=$1; D=$2
grep "^$D" plan.tsv | while IFS=$'\t' read -r DT L I O N; do bash edit.sh $S "$DT" "$L" "$I" "$O" "$N" < /dev/null; done > "log-$D.txt" 2>&1
echo DONE >> "log-$D.txt"

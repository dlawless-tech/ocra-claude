#!/bin/bash
cd /c/Users/trici/ocra-claude
W=.scratch/norms-ubereats/wk1017
: > $W/uber.jsonl
while IFS= read -r S; do
  [ -z "$S" ] && continue
  bash .claude/skills/norms-ubereats/scripts/uber-read.sh nue "$S" "Oct 18" >> $W/uber.jsonl 2>&1
  echo >> $W/uber.jsonl
done < $W/uber-stores.txt
echo DONE >> $W/uber.jsonl

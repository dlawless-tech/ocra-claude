cd /c/Users/trici/ocra-claude; W=.scratch/norms-cc-fees/wk1010
while read S ID A; do echo "=== $S $ID $A"; bash .claude/skills/norms-weekly-cc-fees-accrual/scripts/post-approved.sh ccfu $ID $A; echo "rc=$?"; done < $W/todo2.txt
echo ALLDONE

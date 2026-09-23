# read current Uber payouts figures from a fresh snapshot
cd /c/Users/trici/ocra-claude
bash .claude/skills/bowery-ubereats/scripts/snapshot.sh "" .playwright-cli/uber.txt
grep -m1 -oE 'button "[^"]+" \[ref=[a-z0-9]+\] \[cursor=pointer\]$' <(grep -A1 -E 'generic \[ref=f[0-9]+e[0-9]+\]:$' .playwright-cli/uber.txt | grep -E "button \"(Cookshop|Rosie|Shuka|Vic)") 
grep -m1 -oE 'Selected date range is from [^.]+' .playwright-cli/uber.txt
grep -oE 'treeitem "[^"]+"' .playwright-cli/uber.txt

#!/bin/bash
# nav-at.sh <session>: login if needed, open All Transactions
S="$1"; H=.claude/skills/bowery-ubereats/scripts; SN=$H/snapshot.sh; P="playwright-cli -s=$S"
bash $H/r365-login.sh $S
$P goto "https://bowerygroup.restaurant365.com/react/home?dashboard=operationsHome" >/dev/null 2>&1; sleep 25
pick() { grep -oE "$1 .ref=[a-z0-9]+" .scratch/bue-s.txt | grep -oE 'f[0-9]+e[0-9]+' | head -1; }
sh $SN $S .scratch/bue-s.txt; $P click $(grep -A3 'banner' .scratch/bue-s.txt | grep -oE 'button .ref=f[0-9]+e[0-9]+' | head -1 | grep -oE 'f[0-9]+e[0-9]+') >/dev/null 2>&1; sleep 3
for L in 'button "Accounting"' 'button "Transactions"' 'link "All transactions"'; do sh $SN $S .scratch/bue-s.txt; $P click $(pick "$L") >/dev/null 2>&1; sleep 3; done

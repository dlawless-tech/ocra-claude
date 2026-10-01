#!/bin/bash
# pull.sh ACCT -> fare-dd/an/glACCT.csv via fgh session
set -u
A="$1"; G=/c/Users/trici/ocra-claude/.scratch/fare-gh; O=/c/Users/trici/ocra-claude/.scratch/fare-dd
playwright-cli -s=fdr tab-select 0 >/dev/null 2>&1
playwright-cli -s=fdr eval "$(sed "s/__ACCT__/$A/" $G/setacct.js)" 2>&1 | sed -n '/### Result/{n;p}' | cut -c1-200
playwright-cli -s=fdr eval "$(cat $G/run.js)" 2>&1 | sed -n '/### Result/{n;p}'
sleep 25
N=$(playwright-cli -s=fdr tab-list 2>&1 | grep -cE "^- [0-9]+:"); [ "$N" -lt 2 ] && { sleep 20; N=$(playwright-cli -s=fdr tab-list 2>&1 | grep -cE "^- [0-9]+:"); }; [ "$N" -lt 2 ] && { echo "no report tab"; exit 1; }
playwright-cli -s=fdr tab-select $((N-1)) >/dev/null 2>&1
for i in 1 2 3 4 5 6; do
  playwright-cli -s=fdr eval "$(cat $G/csv.js)" > $O/raw$A.txt 2>&1
  grep -q '"LEN' $O/raw$A.txt && break; sleep 15; done
node $G/getres.js $O/raw$A.txt $O/an/gl$A.csv | head -c 300; echo
playwright-cli -s=fdr tab-close $((N-1)) >/dev/null 2>&1

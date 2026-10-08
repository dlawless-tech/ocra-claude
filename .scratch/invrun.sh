#!/bin/bash
# invrun.sh <session> <id> <loc> <n2285> <n5635> <tot>
S=$1; ID=$2; L=$3; A=$4; B=$5; T=$6
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/APInvoiceForm/$ID" >/dev/null 2>&1; sleep 15
ST=$(playwright-cli -s=$S eval "$(cat .scratch/rdinv.js)" 2>&1 | res)
case "$ST" in *"2285:$A:"*) case "$ST" in *"5635:$B:"*|*) [ "$B" = "0.00" ] || { echo "$L | already? $ST"; } ;; esac;; esac
APPR=0; case "$ST" in *'\"st\":\"Approved\"'*) APPR=1;; esac
if [ $APPR = 1 ]; then playwright-cli -s=$S click 'button:text-is("Edit")' >/dev/null 2>&1; sleep 4; fi
R=$(playwright-cli -s=$S eval "$(sed "s/__N2285__/$A/; s/__N5635__/$B/; s/__TOT__/$T/" .scratch/invset.js)" 2>&1 | res)
case "$R" in *STOP*|"") echo "$L | $ID | FAIL set: $R"; playwright-cli -s=$S reload >/dev/null 2>&1; exit 1;; esac
if [ $APPR = 1 ]; then playwright-cli -s=$S click 'button:text-is("Edit Complete")' >/dev/null 2>&1; else bash .claude/skills/norms-grubhub/scripts/ribbon-menu.sh $S Save "Save" >/dev/null 2>&1; fi
sleep 12; playwright-cli -s=$S reload >/dev/null 2>&1; sleep 15
AF=$(playwright-cli -s=$S eval "$(cat .scratch/rdinv.js)" 2>&1 | res)
OK=1; case "$AF" in *"2285:$A:"*) ;; *) OK=0;; esac
if [ "$B" != "0.00" ]; then case "$AF" in *"5635:$B:"*) ;; *) OK=0;; esac; fi
[ $OK = 1 ] && echo "$L | $ID | OK | $AF" || echo "$L | $ID | FAIL after | $AF"

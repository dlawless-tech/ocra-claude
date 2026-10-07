#!/bin/bash
# Recode one AP invoice's water: 2285 line to <n2285>, 5635 line to <n5635>, adding the line it lacks.
# Usage: relieve-invoice.sh <session> <invoice id> <store> <n2285> <n5635> <water total>
# Approved invoices go through Edit / Edit Complete and stay Approved; unapproved ones use ribbon Save.
# Prints "<store> | <id> | OK | <lines>" after a reload readback, or FAIL.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; SK="$HERE/../.."
S=$1; ID=$2; L=$3; A=$4; B=$5; T=$6
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/APInvoiceForm/$ID" >/dev/null 2>&1; sleep 15
ST=$(playwright-cli -s=$S eval "$(cat "$HERE/read-invoice.js")" 2>&1 | res)
APPR=0; case "$ST" in *'\"st\":\"Approved\"'*) APPR=1;; esac
[ $APPR = 1 ] && { playwright-cli -s=$S click 'button:text-is("Edit")' >/dev/null 2>&1; sleep 4; }
R=$(playwright-cli -s=$S eval "$(sed "s/__N2285__/$A/; s/__N5635__/$B/; s/__TOT__/$T/" "$HERE/invoice-set.js")" 2>&1 | res)
case "$R" in *STOP*|"") echo "$L | $ID | FAIL set: $R"; playwright-cli -s=$S reload >/dev/null 2>&1; exit 1;; esac
if [ $APPR = 1 ]; then playwright-cli -s=$S click 'button:text-is("Edit Complete")' >/dev/null 2>&1
else bash "$SK/norms-grubhub/scripts/ribbon-menu.sh" $S Save "Save" >/dev/null 2>&1; fi
sleep 12; playwright-cli -s=$S reload >/dev/null 2>&1; sleep 15
AF=$(playwright-cli -s=$S eval "$(cat "$HERE/read-invoice.js")" 2>&1 | res)
OK=1; case "$AF" in *"2285:$A:"*) ;; *) OK=0;; esac
[ "$B" = "0.00" ] || case "$AF" in *"5635:$B:"*) ;; *) OK=0;; esac
[ $OK = 1 ] && echo "$L | $ID | OK | $AF" || { echo "$L | $ID | FAIL after | $AF"; exit 1; }

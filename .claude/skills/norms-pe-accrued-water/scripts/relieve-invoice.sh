#!/bin/bash
# Recode one AP invoice's utility lines: accrual line to <nAcc>, expense line to <nExp>, adding the line it lacks.
# Usage: [UTIL=electric] relieve-invoice.sh <session> <invoice id> <store> <nAcc> <nExp> <bill total>
# Approved invoices go through Edit / Edit Complete and stay Approved; unapproved ones use ribbon Save.
# Prints "<store> | <id> | OK | <lines>" after a reload readback, or FAIL.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; SK="$HERE/../.."
. "$HERE/profile.sh"
GACC=$(node -e 'process.stdout.write(require(process.argv[1]).accounts[process.argv[2]]||"")' "$HERE/ids.json" "$ACC")
GEXP=$(node -e 'process.stdout.write(require(process.argv[1]).accounts[process.argv[2]]||"")' "$HERE/ids.json" "$EXP")
[ -n "$GACC" ] && [ -n "$GEXP" ] || { echo "FAIL no account ids for $ACC/$EXP in ids.json"; exit 1; }
S=$1; ID=$2; L=$3; A=$4; B=$5; T=$6
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/APInvoiceForm/$ID" >/dev/null 2>&1; sleep 15
playwright-cli -s=$S eval "() => { const x=document.querySelector('#pendo-base ._pendo-close-guide'); if(x) x.click(); return 1; }" >/dev/null 2>&1  # Pendo guide blocks real clicks
ST=$(playwright-cli -s=$S eval "$(cat "$HERE/read-invoice.js")" 2>&1 | res)
APPR=0; case "$ST" in *'\"st\":\"Approved\"'*) APPR=1;; esac
[ $APPR = 1 ] && { playwright-cli -s=$S click 'button:text-is("Edit")' >/dev/null 2>&1; sleep 4; }
R=$(playwright-cli -s=$S eval "$(sed "s/__NACC__/$A/; s/__NEXP__/$B/; s/__TOT__/$T/; s/__ACC__/$ACC/; s/__EXP__/$EXP/; s/__GACC__/$GACC/; s/__GEXP__/$GEXP/; s/__NOUN__/$NOUN/" "$HERE/invoice-set.js")" 2>&1 | res)
case "$R" in *STOP*|"") echo "$L | $ID | FAIL set: $R"; playwright-cli -s=$S reload >/dev/null 2>&1; exit 1;; esac
if [ $APPR = 1 ]; then playwright-cli -s=$S click 'button:text-is("Edit Complete")' >/dev/null 2>&1
else bash "$SK/norms-grubhub/scripts/ribbon-menu.sh" $S Save "Save" >/dev/null 2>&1; fi
sleep 12; playwright-cli -s=$S reload >/dev/null 2>&1; sleep 15
AF=$(playwright-cli -s=$S eval "$(cat "$HERE/read-invoice.js")" 2>&1 | res)
OK=1; case "$AF" in *"$ACC:$A:"*) ;; *) OK=0;; esac
[ "$B" = "0.00" ] || case "$AF" in *"$EXP:$B:"*) ;; *) OK=0;; esac
[ $OK = 1 ] && echo "$L | $ID | OK | $AF" || { echo "$L | $ID | FAIL after | $AF"; exit 1; }

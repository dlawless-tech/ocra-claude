#!/bin/bash
# Unapprove one entry by real ribbon clicks; confirm the ribbon flips back to Approve.
# usage: unapprove.sh <session> <TransactionId>
set -u
S="$1"; ID="$2"; HOST=https://flecha.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '"'; }
ribbon() { playwright-cli -s=$S eval "() => (document.getElementById('Unapprove') ? 'approved' : document.getElementById('Approve') ? 'unapproved' : 'wait')" 2>&1 | res; }
playwright-cli -s=$S goto about:blank >/dev/null 2>&1
playwright-cli -s=$S goto "$HOST/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
[ "$(ribbon)" = unapproved ] && { echo "unapproved $ID"; exit 0; }
playwright-cli -s=$S click '#Unapprove > a' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click 'li[data-testid="unapproveMenuItem"]' >/dev/null 2>&1; sleep 10
playwright-cli -s=$S goto about:blank >/dev/null 2>&1
playwright-cli -s=$S goto "$HOST/#/form/JournalEntryForm/$ID" >/dev/null 2>&1
for i in 1 2 3 4 5 6 7 8; do sleep 8
  R=$(ribbon); [ "$R" = unapproved ] && { echo "unapproved $ID"; exit 0; }; [ "$R" = approved ] && break
done
echo "FAIL: $ID still approved"; exit 1

#!/bin/bash
# Approve and close one entry by real ribbon clicks; confirm the ribbon flips to Unapprove.
# usage: approve.sh <session> <TransactionId>
set -u
S="$1"; ID="$2"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '"'; }
playwright-cli -s=$S goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
playwright-cli -s=$S click '#Approve > a' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click 'li[data-testid="approveAndCloseMenuItem"]' >/dev/null 2>&1; sleep 12
# same-hash goto does not reload; leave the page first, then poll for the ribbon
playwright-cli -s=$S goto about:blank >/dev/null 2>&1
playwright-cli -s=$S goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1
for i in 1 2 3 4 5 6 7 8; do sleep 8
  R=$(playwright-cli -s=$S eval "() => (document.getElementById('Unapprove') ? 'yes' : document.getElementById('Approve') ? 'no' : 'wait')" 2>&1 | res)
  [ "$R" = yes ] && { echo "approved $ID"; exit 0; }
  [ "$R" = no ] && break
done
echo "FAIL: $ID not approved"; exit 1

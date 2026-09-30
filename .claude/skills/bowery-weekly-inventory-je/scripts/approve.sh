#!/bin/bash
# Approve and Close one journal entry and confirm the server's reply.
# Usage: approve.sh <session> <TransactionId>
set -u
S="$1"; ID="$2"
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/react/home" >/dev/null 2>&1; sleep 3
playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 22
playwright-cli -s=$S click '#Approve > a' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click 'li[data-testid=approveAndCloseMenuItem]' >/dev/null 2>&1; sleep 12
R=$(playwright-cli -s=$S requests 2>&1 | grep 'Transaction/Approve' | tail -1 | grep -oE '^[0-9]+')
[ -n "$R" ] && playwright-cli -s=$S response-body "$R" 2>&1 | grep -q 'Successfully Approved' && echo "approved $ID" || { echo "FAIL: $ID approve not confirmed"; exit 1; }

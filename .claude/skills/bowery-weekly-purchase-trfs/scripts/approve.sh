#!/bin/bash
# Approve the entry through real ribbon clicks, then read its status back from All Transactions.
# usage: approve.sh <session> <TransactionId> <week ending M/D/YYYY>
# Approve and Close drops the tab and its request log, so the grid is the proof.
set -u
S="$1"; ID="$2"; WE="$3"
playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
playwright-cli -s=$S click '#Approve > a' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click 'li[data-testid="approveAndCloseMenuItem"]' >/dev/null 2>&1; sleep 10
ROW=$(bash "$(dirname "$0")/all-transactions.sh" $S | grep -F "$ID")
echo "$ROW"
echo "$ROW" | grep -q "^ *$WE ; Approved ;" || { echo "FAIL: not Approved on $WE"; exit 1; }

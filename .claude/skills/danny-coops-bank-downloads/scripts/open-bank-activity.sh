#!/bin/bash
# Open the Bank Activity page in the session's current tab.
# usage: open-bank-activity.sh <session>
# Dashboard nav has no links for this login, so go to the form URL directly;
# if that drops the session, log back in and go again.
set -u
S="$1"
LOGIN="$(dirname "$0")/../../danny-coops-payroll/scripts/r365-login.sh"
res() { sed -n '/### Result/{n;p;}' | sed 's/^"//; s/"$//'; }
URL='https://dannyandcoops.restaurant365.com/#/form/BankActivityForm/00000000-0000-0000-0000-000000000000'
ready() { playwright-cli -s=$S eval "() => !!document.querySelector('input[name=bankActivityBankAcounts_input]')" 2>&1 | res; }
for try in 1 2; do
  playwright-cli -s=$S goto "$URL" >/dev/null 2>&1
  for i in 1 2 3 4 5 6 7 8; do sleep 5; [ "$(ready)" = true ] && { echo "bank activity open"; exit 0; }; done
  bash "$LOGIN" "$S" || exit 1
done
echo "FAIL: bank activity page did not load"; exit 1

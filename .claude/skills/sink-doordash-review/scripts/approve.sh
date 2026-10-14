#!/bin/bash
# Approve each entry by id through the ribbon. Confirm on All Transactions afterward.
# usage: approve.sh <session> <id>...
S=$1; shift; HERE="$(cd "$(dirname "$0")" && pwd)"
for id in "$@"; do
  while [ "$(playwright-cli -s $S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s $S tab-close 1 >/dev/null 2>&1; done
  playwright-cli -s $S tab-select 0 >/dev/null 2>&1
  playwright-cli -s $S goto "https://journeygroup.restaurant365.com/#/form/JournalEntryForm/$id" >/dev/null 2>&1; sleep 12
  echo "$id $(bash "$HERE/ribbon-menu.sh" $S Approve 'Approve' 2>&1 | grep -oE 'clicked|ERR[^"]*')"; sleep 8
done

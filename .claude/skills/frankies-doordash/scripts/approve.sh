#!/bin/bash
# Approve each entry by id through the ribbon, then reload and print approved or NOT APPROVED.
# usage: approve.sh <session> <id>...
S=$1; shift; HERE="$(cd "$(dirname "$0")" && pwd)"
for id in "$@"; do
  while [ "$(playwright-cli -s $S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s $S tab-close 1 >/dev/null 2>&1; done
  playwright-cli -s $S tab-select 0 >/dev/null 2>&1
  playwright-cli -s $S goto "https://frankiesspuntino.restaurant365.com/#/form/JournalEntryForm/$id" >/dev/null 2>&1; sleep 12
  bash "$HERE/ribbon-menu.sh" $S Approve 'Approve' >/dev/null 2>&1; sleep 8
  playwright-cli -s $S goto about:blank >/dev/null 2>&1
  playwright-cli -s $S goto "https://frankiesspuntino.restaurant365.com/#/form/JournalEntryForm/$id" >/dev/null 2>&1; sleep 14
  # the Unapprove button only shows on an approved entry
  A=$(playwright-cli -s $S eval "() => !!document.querySelector('#Unapprove')" 2>&1 | sed -n '/### Result/{n;p;}')
  [ "$A" = true ] && echo "$id approved" || echo "$id NOT APPROVED"
done

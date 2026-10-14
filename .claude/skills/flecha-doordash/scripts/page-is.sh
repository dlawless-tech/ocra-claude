#!/bin/bash
# Exit 0 when the open Journal Entry form shows this date and location, so a click lands on the right entry.
# usage: page-is.sh <session> <M/D/YYYY> <location>
set -u
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '"'; }
P=$(playwright-cli -s=$1 eval "() => { const c=jQuery('#journalEntryLocation').data('kendoComboBox'); return c ? jQuery('#journalEntryDate').val()+'|'+c.text() : 'none'; }" 2>&1 | res)
[ "$P" = "$2|$3" ] || { echo "FAIL: page shows $P, expected $2|$3"; exit 1; }

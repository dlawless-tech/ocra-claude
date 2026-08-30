#!/usr/bin/env bash
# Drive one store's leg of the Uber Eats -> R365 reconciliation, using
# playwright-cli locator strings validated across 15 stores on 2026-08-30,
# instead of re-deriving refs from a fresh snapshot at every step.
#
# This script does NOT decide dollar amounts. Read the Uber Eats figures
# and the GL beginning balance yourself (or via read-uber-figures.sh /
# read-beg-balance.sh below), work out the six line amounts per the
# skill's formula, and pass them in. Sign handling (which column Net
# Chargeback and the difference line land in) and any nonzero-variance
# call are judgment, not automation - do not have this script guess them.
#
# Usage:
#   reconcile-store.sh switch-uber <uber-search-term>
#   reconcile-store.sh select-period <day-label>              # e.g. "Choose Monday, August 17th"
#   reconcile-store.sh read-uber-figures
#   reconcile-store.sh set-gl-location <r365-location-name> [prev-r365-location-name]
#   reconcile-store.sh run-gl-report
#   reconcile-store.sh read-beg-balance
#   reconcile-store.sh open-entry <r365-location-fragment>     # filters+opens the Number cell, switches tab
#   reconcile-store.sh fill <row-label> <debit|credit> <amount>
#   reconcile-store.sh save-and-approve
#
# Session names are fixed to match the skill: default (Uber Eats), r365
# (journal entry), r365b (GL report).
#
# Validation status:
#   - switch-uber, select-period, run-gl-report, save-and-approve:
#     locator strings copied verbatim from successful playwright-cli runs.
#   - set-gl-location, open-entry, fill: locator SHAPE is copied from
#     successful runs but the specific chain here is a generalization
#     (parameterized by name instead of hardcoded). Confirm the first
#     store with a snapshot before trusting the rest of the batch.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CMD="${1:-}"
shift || true

case "$CMD" in

  switch-uber)
    SEARCH_TERM="$1"
    playwright-cli click "getByTestId('location-selector-button-testid')"
    playwright-cli fill "getByRole('textbox', { name: 'Search' })" "$SEARCH_TERM"
    # Confirm the single match before committing - store names on Uber's
    # side often differ from R365's (see skill: comment-field hint).
    playwright-cli find "$SEARCH_TERM"
    ;;

  confirm-uber-match)
    # Call after switch-uber once you've read the find() output and are
    # satisfied it's the right store.
    playwright-cli click "getByRole('grid', { name: 'grid' }).locator('label')"
    playwright-cli click "getByRole('button', { name: 'Apply' })"
    ;;

  select-period)
    DAY_LABEL="$1"   # e.g. "Choose Monday, August 17th"
    # Date-range button's accessible name is the *currently shown* range,
    # which varies by store's last state - match by pattern, not literal text.
    playwright-cli click "getByRole('button', { name: /\d\d\/\d\d\/\d{4}/ })"
    playwright-cli click "getByRole('gridcell', { name: '${DAY_LABEL}' })"
    ;;

  read-uber-figures)
    # Kept as textual reads (not eval-scraped): these are the numbers that
    # go straight into a journal entry, so legibility beats token savings here.
    for label in "Total Payout" "Earnings" "Marketing" "Uber Fees" "Net Chargeback Amount" "Net Taxes"; do
      playwright-cli find "$label"
    done
    ;;

  set-gl-location)
    NEW_LOC="$1"
    PREV_LOC="${2:-}"
    playwright-cli -s=r365b click "getByRole('button', { name: 'Filter ▼', exact: true })"
    if [[ -n "$PREV_LOC" ]]; then
      playwright-cli -s=r365b click "getByRole('checkbox', { name: '- ${PREV_LOC}' })"
    else
      # First run of a session: clear the fully-checked default set.
      playwright-cli -s=r365b click "getByRole('checkbox').first()"
    fi
    playwright-cli -s=r365b fill "getByRole('textbox', { name: 'Search' })" "$NEW_LOC"
    playwright-cli -s=r365b click "getByRole('checkbox', { name: '- ${NEW_LOC}' })"
    playwright-cli -s=r365b click "getByRole('button', { name: 'OK' })"
    ;;

  run-gl-report)
    playwright-cli -s=r365b click ".layout-align-end-stretch > .md-raised.md-primary.runBTN"
    playwright-cli -s=r365b tab-select 1
    ;;

  read-beg-balance)
    playwright-cli -s=r365b find "Beg Balance"
    ;;

  open-entry)
    LOC_FRAGMENT="$1"
    playwright-cli -s=r365 goto "https://norms.restaurant365.com/react/accounting/legacy/AllTransactions"
    IFRAME_TB="page.locator('[data-testid=\"legacyPage\"]').contentFrame().locator('iframe').contentFrame().getByRole('textbox')"
    playwright-cli -s=r365 fill "${IFRAME_TB}.first()" "Unapproved"
    playwright-cli -s=r365 fill "${IFRAME_TB}.nth(1)" "$LOC_FRAGMENT"
    playwright-cli -s=r365 fill "${IFRAME_TB}.nth(3)" "UberEats"
    playwright-cli -s=r365 press Enter
    # After filtering to Unapproved+Location+UberEats there should be exactly
    # one row. Fire its Number cell's onclick (not a plain click - see skill).
    IFRAME_CELL="page.locator('[data-testid=\"legacyPage\"]').contentFrame().locator('iframe').contentFrame().getByRole('gridcell', { name: 'UberEats' }).first()"
    playwright-cli -s=r365 eval "el => el.querySelector('font').click()" "$IFRAME_CELL"
    playwright-cli -s=r365 tab-select 1
    ;;

  fill)
    "$SCRIPT_DIR/fill-journal-line.sh" r365 "$1" "$2" "$3"
    ;;

  save-and-approve)
    playwright-cli -s=r365 click "getByTestId('saveMenu').getByRole('button', { name: 'Save' })"
    playwright-cli -s=r365 click "getByTestId('saveMenuItem').getByRole('button', { name: 'Save' })"
    playwright-cli -s=r365 reload
    # Confirm the reload shows your amounts before approving - a save that
    # silently failed leaves everything at 0.00 (see skill).
    playwright-cli -s=r365 click "getByRole('button', { name: 'Approve' })"
    playwright-cli -s=r365 click "getByTestId('approveAndCloseMenuItem').getByRole('button', { name: 'Approve and Close' })"
    ;;

  *)
    echo "Unknown command: $CMD" >&2
    echo "See header comment for usage." >&2
    exit 1
    ;;
esac

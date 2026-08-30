#!/usr/bin/env bash
# Fill one debit/credit cell in an open R365 journal entry, by row label,
# without re-snapshotting the grid or tracking refs.
#
# Usage: fill-journal-line.sh <session> <row-label> <column> <amount>
#   session:   r365 session name passed to playwright-cli (-s=...)
#   row-label: substring unique to the row, e.g. "marketing", "uber fees",
#              "net chargeback amount", "difference", "a/r ubereats - payout"
#   column:    debit | credit
#   amount:    plain number, e.g. 65.90
#
# Relies on two things validated across 15 store runs on 2026-08-30:
#   - a locator scoped by row text survives regardless of prior fills
#     (unlike counting "0.00" cells by position, which shifts every time
#      a cell commits)
#   - once a cell is clicked into edit mode, input[name="credit"] /
#     input[name="debit"] addresses the active cell page-wide, with no
#     iframe path needed
#
# NOT yet run live — the row-filter click (steps below) is a redesign of
# the nth("0.00") approach used manually on 2026-08-30, not a copy of a
# proven playwright-cli invocation. Validate on the first store next run
# before trusting it across a full batch: after the click, snapshot once
# and confirm input[name] is inside the intended row before filling.

set -euo pipefail

SESSION="$1"
ROW_LABEL="$2"
COLUMN="$3"   # debit | credit
AMOUNT="$4"

if [[ "$COLUMN" != "debit" && "$COLUMN" != "credit" ]]; then
  echo "column must be 'debit' or 'credit', got: $COLUMN" >&2
  exit 1
fi

# Column order in the grid header is: (blank) Account Debit Credit Comment Location (blank)
# so within a matched row, gridcell index 2 = Debit, index 3 = Credit.
if [[ "$COLUMN" == "debit" ]]; then
  CELL_INDEX=2
else
  CELL_INDEX=3
fi

CLICK_LOCATOR="getByRole('row').filter({ hasText: '${ROW_LABEL}' }).getByRole('gridcell').nth(${CELL_INDEX})"

playwright-cli -s="$SESSION" click "$CLICK_LOCATOR"
playwright-cli -s="$SESSION" fill "input[name=\"$COLUMN\"]" "$AMOUNT"
playwright-cli -s="$SESSION" press Tab

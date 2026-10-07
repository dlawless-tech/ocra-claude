#!/bin/bash
# Build one 3rd Party entry from week-<date>.json by duplicating a prior 3rd Party entry. Saves; does not approve.
# usage: post-week.sh <session> <week json> <source TransactionId>
# Prints "id <new id>", then the check-lines.js table and MATCH or the differences.
# REDO=<id> refills an existing, unapproved entry instead of duplicating.
set -u
S="$1"; W="$2"; SRC="$3"
D=$(dirname "$0"); SK="$D/../.."; HOST=https://flecha.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '"'; }
F() { node -e 'process.stdout.write(String(require(require("path").resolve(process.argv[1]))[process.argv[2]]))' "$W" "$1"; }
DT=$(F date); N=$(F number); CMT=$(F comment)

if [ -n "${REDO:-}" ]; then ID="$REDO"; playwright-cli -s=$S goto "$HOST/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
else ID=$(bash "$SK/flecha-doordash/scripts/duplicate.sh" $S "$SRC" "$DT" "$N") || { echo "$ID"; exit 1; }; fi
echo "id $ID"

playwright-cli -s=$S fill '#journalEntryDate' "$DT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
playwright-cli -s=$S fill '#journalEntryNumber' "$N" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
playwright-cli -s=$S fill '#journalEntryComment' "$CMT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
L=$(playwright-cli -s=$S eval "() => jQuery('#journalEntryLocation').data('kendoComboBox').text()" 2>&1 | res)
[ "$L" = "100 - Corporate" ] || { echo "FAIL: header location reads $L"; exit 1; }

bash "$SK/norms-weekly-change-orders/scripts/load-lines.sh" $S "$W"
OUT=$(bash "$SK/danny-coops-payroll/scripts/save.sh" $S)
echo "$OUT" | grep -q "\"$ID\"" || { echo "FAIL: save answered $OUT"; exit 1; }

# reload and compare the server copy
playwright-cli -s=$S goto "$HOST/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
playwright-cli -s=$S eval "$(cat "$SK/bowery-weekly-mgmt-fees/scripts/read-lines.js")" > readback.txt 2>&1
node "$SK/norms-weekly-change-orders/scripts/check-lines.js" "$W" readback.txt

#!/bin/bash
# Build, render and attach one store's backup PDF to its saved entry.
# usage: backup-store.sh <session> <TransactionId> "<uber store>"   (in the week's directory: week.txt, backup/*.png)
# Stops before attaching when the entry does not tie to Uber.
set -u
S="$1"; ID="$2"; ST="$3"; D=$(cd "$(dirname "$0")"; pwd)
read -r _ A B < week.txt
N=$(echo "$ST" | tr -d '|.()' | tr -s ' ')
playwright-cli -s=$S goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
playwright-cli -s=$S eval "$(cat "$D/../../bowery-weekly-mgmt-fees/scripts/read-lines.js")" > rb.txt 2>&1
mkdir -p bk
node "$D/build-backup.js" week.txt rb.txt "$ST" "backup/Uber ${A}_${B}_$N.png" "bk/$N.html" || exit 1
PDF="backup/Uber Eats backup ${A}_${B}_$N.pdf"
bash "$D/render-backup.sh" bk "$N" "$PDF" | grep -q MISSING && { echo "FAIL: $PDF not rendered"; exit 1; }
bash "$D/attach.sh" $S "$ID" "$PDF"

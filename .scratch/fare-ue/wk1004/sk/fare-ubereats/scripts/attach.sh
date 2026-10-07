#!/bin/bash
# Attach one PDF to a saved entry and confirm it landed.
# usage: attach.sh <session> <TransactionId> <pdf path>
set -u
S="$1"; ID="$2"; PDF="$3"; SK="$(dirname "$0")/../.."
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
F=$(basename "$PDF"); [ "$PDF" -ef "$F" ] || cp "$PDF" .
playwright-cli -s=$S goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
for i in 1 2 3 4; do
  bash "$SK/bowery-ubereats/scripts/snapshot.sh" $S snap.up.txt
  U=$(grep -oE 'button "Upload File" (\[active\] )?.ref=f?[0-9]*e[0-9]+' snap.up.txt | grep -oE 'f?[0-9]*e[0-9]+$' | tail -1)
  [ -n "$U" ] && break; sleep 5
done
[ -n "$U" ] || { echo "FAIL: no Upload File button"; exit 1; }
playwright-cli -s=$S click $U >/dev/null 2>&1
# absolute: the daemon resolves relative paths from wherever the session was opened
playwright-cli -s=$S upload "$(cygpath -w "$PWD/$F")" >/dev/null 2>&1; sleep 8
playwright-cli -s=$S goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
A=$(playwright-cli -s=$S eval "() => Array.from(document.querySelectorAll('a[ng-click^=\"AWS_S3_Uploader.getFile\"]')).map(a => a.title).join(' | ')" 2>&1 | res | tr -d '"')
echo "attached: $A"
echo "$A" | grep -qF "$F" || { echo "FAIL: $F not on the entry"; exit 1; }

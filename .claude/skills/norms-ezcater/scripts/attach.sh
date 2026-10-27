#!/bin/bash
# Attach one file to a saved journal entry unless an attachment of that name is already there, then read the titles back.
# usage: attach.sh <session> <TransactionId> <file>
# <file> must sit under the working directory: playwright-cli upload takes a path relative to it.
set -u
S=$1; ID=$2; F=$3; HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL="https://norms.restaurant365.com/#/form/JournalEntryForm/$ID"
titles() { playwright-cli -s=$S eval "() => Array.from(document.querySelectorAll('a[ng-click^=\"AWS_S3_Uploader.getFile\"]')).map(a => a.title).join('|')" 2>&1 | sed -n '/### Result/,/### Ran/p' | sed '1d;$d' | tr -d '"\n'; }
N=$(basename "$F")
playwright-cli -s=$S goto "$URL" >/dev/null 2>&1; sleep 18
case "|$(titles)|" in *"|$N|"*) echo "attached: $N (already)"; exit 0;; esac
B=
for i in 1 2 3 4; do
  bash "$HERE/snapshot.sh" $S snap.up.txt
  B=$(grep -oE 'button "Upload File".*ref=f?[0-9]*e[0-9]+' snap.up.txt | grep -oE 'f?[0-9]*e[0-9]+$' | tail -1)
  [ -n "$B" ] && break; sleep 5
done
[ -n "$B" ] || { echo "FAIL: no Upload File button"; exit 1; }
playwright-cli -s=$S click $B >/dev/null 2>&1
playwright-cli -s=$S upload "$F" >/dev/null 2>&1; sleep 8
playwright-cli -s=$S goto "$URL" >/dev/null 2>&1; sleep 18
case "|$(titles)|" in *"|$N|"*) echo "attached: $N";; *) echo "FAIL: $N not attached, have: $(titles)"; exit 1;; esac

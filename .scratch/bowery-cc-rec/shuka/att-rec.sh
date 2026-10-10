#!/bin/bash
# Attach one backup file to a saved UberEats journal entry, then read the
# attachment titles back. Leaves other attachments alone; skips a file whose
# name is already attached, so reruns are safe.
#
# Usage: attach-backup.sh <session> <TransactionId> <file>
#   file must sit under the working directory: playwright-cli upload takes a
#   path relative to it.
# Prints ATTACHED <name> only when the reloaded entry lists the file.
set -u
S="$1"; ID="$2"; F="$3"
HERE=/c/Users/trici/ocra-claude/.claude/skills/bowery-ubereats/scripts
N="$(basename "$F")"
URL="https://bowerygroup.restaurant365.com/#/form/BankReconciliationForm/$ID"
[ -s "$F" ] || { echo "FAIL: no file $F"; exit 1; }
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
titles() { playwright-cli -s=$S eval "() => Array.from(document.querySelectorAll('a[ng-click^=\"AWS_S3_Uploader.getFile\"]')).map(a => a.title).join('|')" 2>&1 | res; }
host() { playwright-cli -s=$S eval "() => location.hostname" 2>&1 | res; }

playwright-cli -s=$S goto "$URL" >/dev/null 2>&1; sleep 18
[ "$(host)" = "bowerygroup.restaurant365.com" ] || { echo "FAIL: session logged out, run r365-login.sh $S"; exit 1; }

case "|$(titles)|" in *"|$N|"*) echo "ATTACHED $N (already)"; exit 0 ;; esac

B=
for i in 1 2 3 4; do
  TMP=$(mktemp); bash "$HERE/snapshot.sh" $S $TMP
  B=$(grep -oE 'button "Upload File".*ref=f?[0-9]*e[0-9]+' $TMP | grep -oE 'f?[0-9]*e[0-9]+$' | tail -1)
  rm -f $TMP
  [ -n "$B" ] && break; sleep 5
done
[ -n "$B" ] || { echo "FAIL: no Upload File button"; exit 1; }
# a real click opens the file chooser, upload answers it
playwright-cli -s=$S click $B >/dev/null 2>&1
playwright-cli -s=$S upload "$F" >/dev/null 2>&1; sleep 8

playwright-cli -s=$S goto "$URL" >/dev/null 2>&1; sleep 18
case "|$(titles)|" in *"|$N|"*) echo "ATTACHED $N" ;; *) echo "FAIL: $N not listed after reload"; exit 1 ;; esac

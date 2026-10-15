#!/bin/bash
# Add every file in a folder to one saved journal entry, leaving its other attachments alone, then read the titles back.
# usage: attach.sh <session> <TransactionId> <dir>   (<dir> under the working directory; upload takes a relative path)
set -u
S="$1"; ID="$2"; DIR="$3"
U="$(dirname "$0")/../../bowery-ubereats/scripts"
URL="https://frankiesspuntino.restaurant365.com/#/form/JournalEntryForm/$ID"
ev() { playwright-cli -s=$S eval "$(cat "$1")" 2>&1 | sed -n '/### Result/,/### Ran/p' | sed '1d;$d' | sed 's/^"//; s/"$//'; }
cat > att.js <<'J'
() => Array.from(document.querySelectorAll('a[ng-click^="AWS_S3_Uploader.getFile"]')).map(a => a.title).join('\n')
J
want() { for f in "$DIR"/*; do basename "$f"; done; }

playwright-cli -s=$S goto "$URL" >/dev/null 2>&1; sleep 20

HAVE=$(ev att.js)
for f in "$DIR"/*; do
  case "$HAVE" in *"$(basename "$f")"*) continue ;; esac
  B=
  for i in 1 2 3 4; do
    bash "$U/snapshot.sh" $S snap.up.txt
    # the button carries [active] after the first upload
    B=$(grep -oE 'button "Upload File".*ref=f?[0-9]*e[0-9]+' snap.up.txt | grep -oE 'f?[0-9]*e[0-9]+$' | tail -1)
    [ -n "$B" ] && break; sleep 5
  done
  [ -n "$B" ] || { echo "FAIL: no Upload File button"; exit 1; }
  playwright-cli -s=$S click $B >/dev/null 2>&1
  playwright-cli -s=$S upload "$f" >/dev/null 2>&1; sleep 8
  echo "uploaded $(basename "$f")"
done

playwright-cli -s=$S goto "$URL" >/dev/null 2>&1; sleep 20
GOT=$(ev att.js | sed 's/\\n/\n/g' | sort)
echo "attached: $(echo "$GOT" | paste -sd'|' | sed 's/|/ | /g')"
want | while IFS= read -r t; do echo "$GOT" | grep -qxF "$t" || { echo "MISSING $t"; exit 1; }; done || exit 1

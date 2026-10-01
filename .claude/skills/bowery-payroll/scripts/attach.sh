#!/bin/bash
# Make one saved journal entry's attachments exactly the files in a folder:
# delete any attachment not in it, upload any file not yet attached, then
# read the titles back from R365.
#
#   attach.sh <session> <TransactionId> <dir>
#
# <dir> must sit under the working directory: playwright-cli upload takes a
# path relative to it.
set -u
S="$1"; ID="$2"; DIR="$3"
U="$(dirname "$0")/../../bowery-ubereats/scripts"
URL="https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/$ID"
ev() { playwright-cli -s=$S eval "$(cat "$1")" 2>&1 | sed -n '/### Result/,/### Ran/p' | sed '1d;$d' | sed 's/^"//; s/"$//'; }
cat > att.js <<'J'
() => Array.from(document.querySelectorAll('a[ng-click^="AWS_S3_Uploader.getFile"]')).map(a => a.title).join('\n')
J
want() { for f in "$DIR"/*; do basename "$f"; done; }

playwright-cli -s=$S goto "$URL" >/dev/null 2>&1; sleep 20

# delete: the X opens R365's own Delete Confirmation dialog
ev att.js | sed 's/\\n/\n/g' | while IFS= read -r t; do
  [ -n "$t" ] || continue
  want | grep -qxF "$t" && continue
  sel=".aws-uploader-file-list-item:has(a[title=\"$t\"]) button.delete-file"
  playwright-cli -s=$S click "$sel" >/dev/null 2>&1; sleep 2
  bash "$U/snapshot.sh" $S snap.del.txt
  D=$(grep -A6 'dialog "Delete Confirmation"' snap.del.txt | grep -oE 'button "Delete" .ref=f?[0-9]*e[0-9]+' | grep -oE 'f?[0-9]*e[0-9]+$')
  [ -n "$D" ] || { echo "FAIL: no Delete Confirmation for $t"; exit 1; }
  playwright-cli -s=$S click $D >/dev/null 2>&1; sleep 3
  echo "deleted $t"
done || exit 1

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
[ "$GOT" = "$(want | sort)" ] || { echo "MISMATCH against $DIR"; exit 1; }

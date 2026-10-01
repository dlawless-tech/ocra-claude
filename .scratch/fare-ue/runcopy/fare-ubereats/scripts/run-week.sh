#!/bin/bash
# One full week: read Uber, build lines, then per store post, attach, approve.
# usage: run-week.sh <start YYYY-MM-DD> <end YYYY-MM-DD> <weekEnding M/D/YYYY> <prior ids file> <out ids file>
# ids files hold "<uber store>|<TransactionId>" per line; the prior week's entry is each store's source.
# Stops a store at its first failed step and carries on; the out file lists only approved stores.
set -u
A="$1"; B="$2"; WE="$3"; PRIOR="$4"; OUT="$5"; S=${R365_SESSION:-fue-r365}; D=$(cd "$(dirname "$0")"; pwd)
bash "$D/r365-login.sh" $S >/dev/null || { echo "FAIL: R365 login"; exit 1; }
[ -n "${SKIP_READ:-}" ] || bash "$D/read-week.sh" "$A" "$B"
node "$D/build-lines.js" week.txt "$WE" > lines.json || exit 1
: > "$OUT"
while IFS= read -r ST; do
  echo "##### $ST"
  SRC=$(grep -F "$ST|" "$PRIOR" | head -1 | cut -d'|' -f2-); SRC=${SRC##*|}
  [ -n "$SRC" ] || { echo "FAIL: no prior entry for $ST"; continue; }
  while playwright-cli -s=$S tab-list 2>&1 | grep -qE '^- 1:'; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
  playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
  bash "$D/post-store.sh" $S lines.json "$ST" "$SRC" > post.txt 2>&1; P=$?
  grep -vE '^(debit|credit) ' post.txt
  ID=$(sed -n 's/^id //p' post.txt)
  [ $P -eq 0 ] && grep -q '^MATCH' post.txt || { echo "FAIL: $ST not posted cleanly${ID:+ (entry $ID left unapproved)}"; continue; }
  PDF="backup/Uber ${A}_${B}_$(echo "$ST" | tr -d '|.()' | tr -s ' ').pdf"
  bash "$D/attach.sh" $S "$ID" "$PDF" || continue
  bash "$D/approve.sh" $S "$ID" && echo "$ST|$ID" >> "$OUT"
done < <(node -e 'console.log(Object.keys(require(process.argv[1])).join("\n"))' "$(cd "$D"; pwd -W 2>/dev/null || pwd)/stores.json")
echo "approved $(wc -l < "$OUT") of 10"

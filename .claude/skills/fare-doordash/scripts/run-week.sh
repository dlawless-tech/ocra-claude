#!/bin/bash
# Post, attach and approve every store's entry for one week.
# usage: run-week.sh <session> <lines.json> <attachment dir> <sources file> <ids out file>
# sources: one "store|prior TransactionId" per line. ids out gets "store|new TransactionId" per approved
# store, ready to be the next week's sources. A store that fails anywhere is reported and left unapproved.
set -u
S="$1"; L="$2"; ATT="$3"; SRC="$4"; IDS="$5"
D=$(dirname "$0"); UE="$D/../../fare-ubereats/scripts"
DUP=$(cut -d'|' -f1 "$SRC" | grep . | sort | uniq -d); [ -z "$DUP" ] || { echo "FAIL: $SRC names a store twice: $DUP"; exit 1; }
: > "$IDS"
while IFS="|" read -r -u 3 ST PRIOR; do
  [ -n "$ST" ] || continue
  echo "######## $ST"
  bash "$UE/r365-login.sh" $S >/dev/null 2>&1 || bash "$UE/r365-login.sh" $S || { echo "FAIL $ST: login"; continue; }
  N=$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:'); while [ "$N" -gt 1 ]; do playwright-cli -s=$S tab-close $((N-1)) >/dev/null 2>&1; N=$((N-1)); done
  OUT=$(bash "$D/post-store.sh" $S "$L" "$ST" "$PRIOR" 2>&1)
  ID=$(echo "$OUT" | grep -oE '^id [0-9a-f-]{36}' | cut -c4-)
  ZERO=$(node -e 'const x=require(require("path").resolve(process.argv[1]));process.stdout.write(String(x.stores.find(s=>s.store===process.argv[2]).zero))' "$L" "$ST")
  if [ "$ZERO" = "true" ]; then
    echo "$OUT" | grep -q 'no sales this week' || { echo "FAIL $ST: zero entry not confirmed (id ${ID:-none})"; echo "$OUT" | tail -5; continue; }
    echo "zero entry $ID"
  else
    echo "$OUT" | grep -E '^(credit|debit|Total) '
    echo "$OUT" | grep -qx MATCH || { echo "FAIL $ST: no MATCH (id ${ID:-none})"; echo "$OUT" | grep -E 'STOP|FAIL|MISMATCH|^  '; continue; }
    F=$(ls "$ATT"/DoorDash\ payout\ *\ "$ST".csv 2>/dev/null | head -1)
    [ -n "$F" ] || { echo "FAIL $ST: no payout CSV in $ATT (id $ID)"; continue; }
    A=$(bash "$UE/attach.sh" $S $ID "$F" 2>&1 | tail -1); echo "$A"
    echo "$A" | grep -q '^attached' || { echo "FAIL $ST: attachment (id $ID)"; continue; }
  fi
  bash "$UE/approve.sh" $S $ID || { echo "FAIL $ST: approve (id $ID)"; continue; }
  echo "$ST|$ID" >> "$IDS"
done 3< "$SRC"
echo "approved $(grep -c . "$IDS") of $(grep -c . "$SRC")"

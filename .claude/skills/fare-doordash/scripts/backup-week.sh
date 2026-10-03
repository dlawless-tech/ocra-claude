#!/bin/bash
# Build and attach one week's backup PDF to every store's approved DoorDash entry.
# usage: backup-week.sh <DoorDash session> <R365 session> <report dir> <lines.json> <ids file> <out dir>
# ids file: "store|TransactionId" per line, as run-week.sh writes it. Zero stores are skipped.
# Stops before attaching anything if a page does not tie. An entry already holding its backup is left alone.
set -u
DS="$1"; RS="$2"; REP="$3"; L="$4"; IDS="$5"; OUT="$6"
D=$(cd "$(dirname "$0")" && pwd); SK="$D/../.."; UE="$SK/fare-ubereats/scripts"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
# store|storeId|payoutIds(space)|MM.DD per nonzero store
PLAN=$(node -e '
const x=require(require("path").resolve(process.argv[1])), S=require(process.argv[2]);
const md=x.weekEnding.split("/").slice(0,2).map(v=>v.padStart(2,"0")).join(".");
for (const s of x.stores) if (!s.zero) console.log([s.store, Object.keys(S).find(k=>S[k][0]===s.store), [...new Set(s.payoutIds)].join(" "), md].join("|"));
' "$L" "$D/stores.json")
mkdir -p "$OUT/shots" "$OUT/posted"

echo "== capture"
while IFS="|" read -r ST SID PIDS MD; do for P in $PIDS; do
  [ -s "$OUT/shots/$P.png" ] && continue
  bash "$D/capture-payout.sh" $DS $SID $P "$OUT/shots/$P.png" > "$OUT/shots/$P.txt" || { cat "$OUT/shots/$P.txt"; rm -f "$OUT/shots/$P.png"; echo "FAIL $ST: capture $P"; exit 1; }
  echo "$ST $P: $(head -1 "$OUT/shots/$P.txt" | grep -oE 'from .*20[0-9]{2}')"
done; done <<< "$PLAN"

echo "== read back"
bash "$UE/r365-login.sh" $RS >/dev/null 2>&1 || bash "$UE/r365-login.sh" $RS || exit 1
while IFS="|" read -r ST SID PIDS MD; do
  ID=$(grep "^$ST|" "$IDS" | cut -d'|' -f2); [ -n "$ID" ] || { echo "FAIL $ST: no id in $IDS"; exit 1; }
  playwright-cli -s=$RS goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
  playwright-cli -s=$RS eval "$(cat "$SK/bowery-weekly-mgmt-fees/scripts/read-lines.js")" 2>&1 | res | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s)))' > "$OUT/posted/$ST.json" || { echo "FAIL $ST: read back $ID"; exit 1; }
done <<< "$PLAN"

echo "== build"
node "$D/build-backup.js" "$REP" "$L" "$OUT/html" --posted "$OUT/posted" --shots "$OUT/shots" || { echo "FAIL: backup does not tie, nothing attached"; exit 1; }
ARGS=(); while IFS="|" read -r ST SID PIDS MD; do ARGS+=("$ST" "$OUT/att/$ST/DoorDash $ST $MD backup.pdf"); done <<< "$PLAN"
bash "$SK/bowery-grubhub/scripts/backup/render-pdf.sh" "$OUT/html" "${ARGS[@]}"

echo "== attach"
N=0
while IFS="|" read -r ST SID PIDS MD; do
  ID=$(grep "^$ST|" "$IDS" | cut -d'|' -f2); F="$OUT/att/$ST/DoorDash $ST $MD backup.pdf"
  [ "$(stat -c %s "$F" 2>/dev/null || echo 0)" -gt 1024 ] || { echo "FAIL $ST: blank or missing PDF"; continue; }
  playwright-cli -s=$RS goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
  A=$(playwright-cli -s=$RS eval "() => Array.from(document.querySelectorAll('a[ng-click^=\"AWS_S3_Uploader.getFile\"]')).map(a => a.title).join(' | ')" 2>&1 | res | tr -d '"')
  if echo "$A" | grep -qF "$(basename "$F")"; then echo "$ST: already attached"; N=$((N+1)); continue; fi
  bash "$UE/attach.sh" $RS $ID "$F" 2>&1 | tail -1 | grep -q '^attached' && { echo "$ST: attached"; N=$((N+1)); } || echo "FAIL $ST: attach ($ID)"
done <<< "$PLAN"
echo "backup on $N of $(echo "$PLAN" | grep -c .)"

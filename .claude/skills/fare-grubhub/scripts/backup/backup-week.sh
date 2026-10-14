#!/bin/bash
# Build, check and attach one week's backup PDF on every store's GrubHub entry.
# usage: backup-week.sh <r365 session> <week.raw> <ids.txt>
# ids.txt: one "store|TransactionId" line per store. Writes under ./backup-<period start>/; reruns skip attachments already done.
set -u
R=$1; RAW=$2; IDS=$3
B=$(cd "$(dirname "$0")" && pwd -W); BG="$B/../../../bowery-grubhub/scripts/backup"; UE="$B/../../../fare-ubereats/scripts"
res() { sed -n '/### Result/{n;p}'; }
START=$(node -e 'process.stdout.write(require(process.argv[2]).readWeek(process.argv[1]).start)' "$RAW" "$B/../tx.js")
W="backup-$START"; mkdir -p "$W/html" "$W/att"

# read back every entry
: > "$W/rb.txt"
while IFS='|' read -r ST ID; do
  playwright-cli -s=$R goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 18
  echo "$ST|$ID|$(playwright-cli -s=$R eval "$(cat "$B/read-entry.js")" 2>&1 | res)" >> "$W/rb.txt"
done < "$IDS"

node "$B/make-plans.js" "$RAW" "$W/rb.txt" "$W/plans" >/dev/null || exit 1
ARGS=(); BAD=0
for f in "$W"/plans/*.json; do
  id=$(basename "$f" .json)
  OUT=$(node "$B/build-backup.js" "$f" "$W/html/$id.html"); echo "$OUT"
  case "$OUT" in *"DOES NOT TIE"*) BAD=1; continue;; esac
  N=$(node -e 'const p=require(process.argv[1]);const[m,d]=p.entryDate.split("/");process.stdout.write(`GrubHub ${p.store} ${m.padStart(2,"0")}.${d.padStart(2,"0")} backup.pdf`)' "$(cd "$(dirname "$f")" && pwd -W)/$id.json")
  mkdir -p "$W/att/$id"; ARGS+=("$id" "$W/att/$id/$N")
done
[ ${#ARGS[@]} -gt 0 ] && bash "$BG/render-pdf.sh" "$W/html" "${ARGS[@]}" | awk '$1<2000{print "FAIL: small pdf "$0}'

# attach, skipping entries that already hold the file
for ((i=0; i<${#ARGS[@]}; i+=2)); do
  id=${ARGS[i]}; P=${ARGS[i+1]}; N=$(basename "$P")
  grep -F "|$id|" "$W/rb.txt" | grep -qF "$N" && { echo "$id already has $N"; continue; }
  echo "$id $(bash "$UE/attach.sh" $R $id "$P" | tail -1)"
done
[ $BAD = 0 ] || { echo "STOP: an entry does not tie, its backup was not attached"; exit 1; }

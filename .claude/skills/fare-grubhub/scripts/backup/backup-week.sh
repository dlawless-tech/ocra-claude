#!/bin/bash
# Build, check and attach one week's backup PDF on every store's GrubHub entry.
# usage: backup-week.sh <grubhub session> <r365 session> <week.raw> <ids.txt>
# ids.txt: one "store|TransactionId" line per store. Writes under ./backup-<period start>/; reruns skip captures and attachments already done.
set -u
G=$1; R=$2; RAW=$3; IDS=$4
B=$(cd "$(dirname "$0")" && pwd -W); BG="$B/../../../bowery-grubhub/scripts/backup"; UE="$B/../../../fare-ubereats/scripts"
res() { sed -n '/### Result/{n;p}'; }
eval "$(node -e '
let s=require("fs").readFileSync(process.argv[1],"utf8"); s=s.slice(s.indexOf("\"{"), s.lastIndexOf("}\"")+2); const w=JSON.parse(JSON.parse(s));
const d=(v,n)=>{const x=new Date(v+"T00:00:00Z"); x.setUTCDate(x.getUTCDate()+n); return x.toISOString().slice(0,10)};
const us=v=>v.slice(5,7)+"/"+v.slice(8,10)+"/"+v.slice(0,4);
console.log(`START=${w.start}; PAID="${us(d(w.end,1))} - ${us(d(w.end,7))}"; WIDE="${us(w.start)} - ${us(d(w.end,14))}"`)' "$RAW")"
W="backup-$START"; mkdir -p "$W/shots" "$W/html" "$W/att"

# read back every entry
: > "$W/rb.txt"
while IFS='|' read -r ST ID; do
  playwright-cli -s=$R goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 18
  echo "$ST|$ID|$(playwright-cli -s=$R eval "$(cat "$B/read-entry.js")" 2>&1 | res)" >> "$W/rb.txt"
done < "$IDS"

# captures: every deposit an entry names, and each zero store's empty deposit history
node -e '
const fs=require("fs"), st=require(process.argv[3]);
let s=fs.readFileSync(process.argv[1],"utf8"); s=s.slice(s.indexOf("\"{"), s.lastIndexOf("}\"")+2); const w=JSON.parse(JSON.parse(s));
const rid=Object.fromEntries(w.deposits.map(d=>[d.short_distribution_id,d.rest_id]));
for (const l of fs.readFileSync(process.argv[2],"utf8").split(/\r?\n/).filter(Boolean)) {
  const [store,,...r]=l.split("|"); let e=r.join("|"); e=JSON.parse(e.startsWith("\"")?JSON.parse(e):e);
  const c=(e.lines.find(x=>x[0].startsWith("1103"))||[])[3]||""; const ids=((c.match(/deposit (.*)$/)||[,""])[1]).split(" + ").filter(Boolean);
  if (ids.length) ids.forEach(i=>console.log("dep "+rid[i]+" "+i));
  else console.log("none "+Object.keys(st).find(k=>st[k][0]===store)+" "+store.replace(/ /g,""));
}' "$RAW" "$W/rb.txt" "$B/../stores.json" | while read -r K RID X; do
  if [ $K = dep ]; then [ -s "$W/shots/$X.png" ] || bash "$BG/capture-deposit.sh" $G $RID $X "$W/shots/$X.png" "$WIDE"
  else [ -s "$W/shots/none-$X-$START-pick.png" ] || bash "$B/capture-none.sh" $G $RID "$W/shots/none-$X-$START" "$PAID"; fi
done

node "$B/make-plans.js" "$RAW" "$W/rb.txt" "$W/shots" "$W/plans" >/dev/null || exit 1
ARGS=(); BAD=0
for f in "$W"/plans/*.json; do
  id=$(basename "$f" .json)
  OUT=$(node "$B/build-backup.js" "$f" "$W/html/$id.html"); echo "$OUT"
  case "$OUT" in *"DOES NOT TIE"*) BAD=1; continue;; esac
  N=$(node -e 'const p=require(process.argv[1]);const[m,d]=p.entryDate.split("/");process.stdout.write(`GrubHub ${p.store} ${m.padStart(2,"0")}.${d.padStart(2,"0")} backup.pdf`)' "$(cd "$(dirname "$f")" && pwd -W)/$id.json")
  mkdir -p "$W/att/$id"; ARGS+=("$id" "$W/att/$id/$N")
done
[ ${#ARGS[@]} -gt 0 ] && bash "$BG/render-pdf.sh" "$W/html" "${ARGS[@]}" | awk '$1<20000{print "FAIL: small pdf "$0}'

# attach, skipping entries that already hold the file
for ((i=0; i<${#ARGS[@]}; i+=2)); do
  id=${ARGS[i]}; P=${ARGS[i+1]}; N=$(basename "$P")
  grep -F "|$id|" "$W/rb.txt" | grep -qF "$N" && { echo "$id already has $N"; continue; }
  echo "$id $(bash "$UE/attach.sh" $R $id "$P" | tail -1)"
done
[ $BAD = 0 ] || { echo "STOP: an entry does not tie, its backup was not attached"; exit 1; }

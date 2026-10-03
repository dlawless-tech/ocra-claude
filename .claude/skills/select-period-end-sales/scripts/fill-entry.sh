#!/bin/bash
# Fill one Select Sales entry from lines.json, save, and check the server copy.
# usage: fill-entry.sh <session> <TransactionId> <lines.json> <ca|nv>
set -u
SK=$(cd "$(dirname "$0")" && pwd); S=$1; ID=$2; LJ=$3; K=$4
SAVE="$SK/../../danny-coops-payroll/scripts/save.sh"; READ="$SK/../../bowery-weekly-mgmt-fees/scripts/read-lines.js"
res() { sed -n '/### Result/{n;p;}'; }
fail() { echo "FAIL: $1"; exit 1; }
W=$(node -e 'console.log(JSON.stringify(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))[process.argv[2]].lines))' "$LJ" "$K")
NUM=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))[process.argv[2]].number)' "$LJ" "$K")
DT=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))[process.argv[2]].date)' "$LJ" "$K")

playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
playwright-cli -s=$S fill '#journalEntryDate' "$DT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
playwright-cli -s=$S fill '#journalEntryNumber' "$NUM" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
echo "set: $(playwright-cli -s=$S eval "$(sed "s/__W__/$W/" "$SK/set-lines.tpl.js")" 2>&1 | res)"
bash "$SAVE" $S | grep -q "\"$ID\"" || fail "save did not commit"

playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
playwright-cli -s=$S eval "$(cat "$READ")" 2>&1 | res > readback.json
node -e '
const fs=require("fs"), j=JSON.parse(JSON.parse(fs.readFileSync("readback.json","utf8"))), e=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))[process.argv[2]];
const c=x=>Math.round(x*100); let ok=j.date===e.date && j.number===e.number && j.lines.length===e.lines.length;
for(const [a,dr,cr] of e.lines){ const l=j.lines.find(x=>String(x.a).startsWith(a+" ")); const hit=l && c(l.dr)===c(dr) && c(l.cr)===c(cr) && /^370 /.test(l.loc); ok=ok&&!!hit;
  console.log((hit?"  ":"! ")+a+" dr "+(l?l.dr:"-")+" cr "+(l?l.cr:"-")+" want "+dr+"/"+cr); }
console.log(j.date+" "+j.number+" "+(ok?"MATCH":"MISMATCH")); process.exit(ok?0:1);' "$LJ" "$K"

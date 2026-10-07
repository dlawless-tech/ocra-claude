#!/bin/bash
# Build the period-end true-up JE from a copy of an existing JE, save it Unapproved, verify on reload.
# Usage: trueup-entry.sh <session> <source JE id> <M/D/YYYY> "<number>" <lines.json> "<comment>"
#   lines.json: [{"acct":"2285","loc":"217 - Anaheim","dr":0,"cr":123.45}, ...], balanced.
# Prints "<id> OK n=<lines> <total>" and leaves the entry Unapproved for review.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; SK="$HERE/../.."
S=$1; SRC=$2; DT=$3; NUM=$4; LINES=$5; CMT=$6
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
ntabs() { playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:'; }
while [ "$(ntabs)" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$SRC" >/dev/null 2>&1; sleep 14
playwright-cli -s=$S click '#Action > a' >/dev/null 2>&1; sleep 1
playwright-cli -s=$S eval "() => { [...document.querySelectorAll('#Action li')].find(x=>x.innerText.trim()==='Duplicate').querySelector('a').click(); return 1; }" >/dev/null 2>&1; sleep 5
bash "$SK/bowery-ubereats/scripts/snapshot.sh" $S _dup.txt
R=$(grep -E 'button "No, transaction only"' _dup.txt | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
[ -n "$R" ] && playwright-cli -s=$S click $R >/dev/null 2>&1
for i in 1 2 3 4 5 6; do sleep 5; [ "$(ntabs)" -ge 2 ] && break; done
ID=$(playwright-cli -s=$S tab-list 2>&1 | grep -E '^- 1:' | grep -oE 'JournalEntryForm/[0-9a-f-]+' | cut -d/ -f2)
[ -n "$ID" ] || { echo "FAIL no copy"; exit 1; }
playwright-cli -s=$S tab-close 1 >/dev/null 2>&1
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 15
playwright-cli -s=$S fill 'input[name="journalEntryDate"]' "$DT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill 'input[name="journalEntryNumber"]' "$NUM" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
JS=$(node -e 'const fs=require("fs");const [t,l,c,i]=process.argv.slice(1);process.stdout.write(fs.readFileSync(t,"utf8").replace("__LINES__",fs.readFileSync(l,"utf8")).replace("__C__",JSON.stringify(c)).replace("__IDS__",fs.readFileSync(i,"utf8")))' "$HERE/je-lines.js" "$LINES" "$CMT" "$HERE/ids.json")
R=$(playwright-cli -s=$S eval "$JS" 2>&1 | res); echo "grid $R  (copy $ID)"
bash "$SK/norms-grubhub/scripts/ribbon-menu.sh" $S Save "Save" >/dev/null 2>&1; sleep 14
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 16
B=$(playwright-cli -s=$S eval "$(cat "$HERE/read-je.js")" 2>&1 | sed -n '/### Result/{n;p;}')
node -e '
const j=JSON.parse(JSON.parse(process.argv[1])), want=JSON.parse(require("fs").readFileSync(process.argv[2],"utf8"));
const k=(a,d,c,l)=>[a,(+d).toFixed(2),(+c).toFixed(2),l].join("|");
const got=j.lines.map(s=>{const f=s.split(" | ");return k(f[0].slice(0,4),f[1],f[2],f[3])}).sort(), w=want.map(x=>k(x.acct,x.dr,x.cr,x.loc)).sort();
const miss=w.filter(x=>!got.includes(x)), extra=got.filter(x=>!w.includes(x));
const tot=want.reduce((s,x)=>s+(+x.dr),0).toFixed(2);
if(miss.length||extra.length){console.log("FAIL readback",JSON.stringify({miss,extra}));process.exit(1)}
console.log(process.argv[3]+" OK n="+got.length+" "+tot+" "+j.st)' "$B" "$LINES" "$ID"

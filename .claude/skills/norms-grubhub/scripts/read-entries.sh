#!/bin/bash
# Read every line of each entry, comment-less lines included.
# usage: read-entries.sh <session> <ids.tsv: loc TAB id> <out.json>
set -u
S=$1; IN=$2; OUT=$3
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
JS="() => { const rows=Array.from(document.querySelectorAll('tr')).map(r=>Array.from(r.cells||[]).map(c=>c.innerText.trim())); return JSON.stringify({dt:(document.querySelector('input[name=journalEntryDate]')||{}).value, st:(document.body.innerText.match(/Unapproved|Approved/)||['?'])[0], L:rows.filter(r=>r.length===9&&/^[0-9]{4} - /.test(r[1]||'')).map(r=>[r[1].slice(0,4),r[3],r[4],r[5],r[6]])}); }"
TMP=$(mktemp)
while IFS=$'\t' read -r loc id; do
  [ -n "$id" ] || continue
  playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$id" >/dev/null 2>&1; sleep 10
  printf '%s\t%s\t%s\n' "$loc" "$id" "$(playwright-cli -s=$S eval "$JS" 2>&1 | res)" >> $TMP
done < "$IN"
node -e 'const fs=require("fs");const o=fs.readFileSync(process.argv[1],"utf8").trim().split(/\r?\n/).map(l=>{const [loc,id,v]=l.split("\t");let j=JSON.parse(v);if(typeof j==="string")j=JSON.parse(j);return {loc,id,...j};});fs.writeFileSync(process.argv[2],JSON.stringify(o,null,1));for(const e of o)console.log(e.loc.padEnd(17),e.dt,e.st,e.L.length+" lines",e.L.map(l=>l[1]+"/"+l[2]).join(" "))' $TMP "$OUT"
rm -f $TMP

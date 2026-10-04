#!/bin/bash
# Read one week's DoorDash entries back from R365 into the entries file plan-week.js takes.
# usage: read-week.sh <session> <ids.txt> <out.json>
#   ids.txt: one "<location>|<TransactionId>" per line, from the All Transactions grid
# Keys each entry by the location its own lines carry and drops a read whose location
# disagrees with the id's, so a raced page never lands under the wrong store.
set -u
S="$1"; IN="$2"; OUT="$3"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP=$(mktemp)
while IFS='|' read -r L ID; do
  [ -n "$ID" ] || continue
  for t in 1 2 3; do
    playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 11
    R=$(playwright-cli -s=$S eval "$(cat "$HERE/read-entry.js")" 2>&1 | sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n')
    case "$R" in *lines*"$L"*) break;; esac
  done
  printf '%s\t%s\t%s\n' "$L" "$ID" "$R" >> "$TMP"
done < "$IN"
node -e 'const fs=require("fs"); const o={}; for(const l of fs.readFileSync(process.argv[1],"utf8").split(/\r?\n/)){ if(!l) continue; const [loc,id,raw]=l.split("\t"); let e; try{ e=JSON.parse(JSON.parse(raw)); }catch(x){ console.error(loc+" FAIL: unreadable"); continue; }
  if(!e.lines.length||!e.lines.every(x=>String(x[4]).endsWith(loc))){ console.error(loc+" FAIL: page showed another entry"); continue; } o[loc]={id,...e}; }
  fs.writeFileSync(process.argv[2], JSON.stringify(o,null,1)); console.log(Object.keys(o).length+" entries read");' "$TMP" "$OUT"
rm -f "$TMP"

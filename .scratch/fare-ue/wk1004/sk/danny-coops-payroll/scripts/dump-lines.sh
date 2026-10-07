#!/bin/bash
# Dump a journal entry's rendered line grid to a json file.
#
#   dump-lines.sh <session> <out.json> [TransactionId]
#
# With an id, opens that entry first; the hash route survives a goto without
# dropping the session, and the grid needs about 20 seconds to render.
set -u
S="$1"; OUT="$2"; ID="${3:-}"
if [ -n "$ID" ]; then
  playwright-cli -s=$S goto "https://dannyandcoops.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1
  sleep 22
fi
playwright-cli -s=$S eval "() => { const \$=window.jQuery; const g=\$('[data-role=grid]').toArray().map(e=>\$(e).data('kendoGrid')).filter(Boolean)[0]; return JSON.stringify(Array.from(g.tbody[0].querySelectorAll('tr')).map(tr => Array.from(tr.children).map(td => td.innerText.trim()))); }" 2>&1 \
  | sed -n '/### Result/,/### Ran/p' | sed '1d;$d' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s.trim())))' > "$OUT"
node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.error("dumped "+r.length+" lines")' "$OUT"

#!/bin/bash
# Dump a journal entry's rendered line grid to a json file.
#
#   dump-lines.sh <session> <TransactionId> <out.json>
#
# The hash route is the one R365 URL that survives a goto without dropping the
# session. The grid needs about 20 seconds to render.
set -u
S="$1"; ID="$2"; OUT="$3"
playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1
sleep 22
playwright-cli -s=$S eval "() => { const \$=window.jQuery; const g=\$('[data-role=grid]').toArray().map(e=>\$(e).data('kendoGrid')).filter(Boolean)[0]; return JSON.stringify(Array.from(g.tbody[0].querySelectorAll('tr')).map(tr => Array.from(tr.children).map(td => td.innerText.trim()))); }" 2>&1 \
  | sed -n '/### Result/,/### Ran/p' | sed '1d;$d' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s.trim())))' > "$OUT"
node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.error("dumped "+r.length+" lines")' "$OUT"

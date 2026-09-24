#!/bin/bash
# Dump the payroll entry's rendered line grid to a json file.
# usage: dump-lines.sh <session> <out.json>
S="$1"; OUT="$2"
playwright-cli -s=$S eval "() => { const \$=window.jQuery; const g=\$('[data-role=grid]').toArray().map(e=>\$(e).data('kendoGrid')).filter(Boolean)[0]; return JSON.stringify(Array.from(g.tbody[0].querySelectorAll('tr')).map(tr => Array.from(tr.children).map(td => td.innerText.trim()))); }" 2>&1 \
  | sed -n '/### Result/,/### Ran/p' | sed '1d;$d' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s.trim())))' > "$OUT"
node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.error("dumped "+r.length+" lines")' "$OUT"

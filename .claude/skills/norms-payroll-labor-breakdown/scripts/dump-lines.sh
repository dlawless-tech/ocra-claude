#!/bin/bash
# Dump the open journal entry's lines from the grid's data source.
# usage: dump-lines.sh <session> <out.json>
S="$1"; OUT="$2"
playwright-cli -s=$S eval "() => { const g=jQuery('[data-role=grid]').toArray().map(e=>jQuery(e).data('kendoGrid')).filter(Boolean)[0]; const o=[]; for(let i=0;i<g.dataSource.total();i++){ const m=g.dataSource.at(i); o.push({i, account:m.glAccount||'', debit:+m.debit||0, credit:+m.credit||0, comment:m.comment||'', location:m.location||'', locationId:m.locationId}); } return JSON.stringify(o); }" 2>&1 \
  | sed -n '/### Result/,/### Ran/p' | sed '1d;$d' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s.trim())))' > "$OUT"
node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.error("dumped "+r.length+" lines")' "$OUT"

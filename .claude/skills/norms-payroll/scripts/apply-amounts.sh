#!/bin/bash
# Write planned amounts onto the entry's lines, in chunks.
# usage: apply-amounts.sh <session> <plan.json> [chunk]
# The plan is [[rowIndex, debit, credit], ...] from build-plan.js. Kendo's
# model.set reaches the grid where a scripted cell click does not, and the
# rendered cells update, so dump-lines.sh reads the result back.
set -u
S="$1"; P="$2"; CH="${3:-30}"
N=$(node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).length))' "$P")
echo "applying $N edits in chunks of $CH"
for (( ST=0; ST<N; ST+=CH )); do
  CHUNK=$(node -e 'const p=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(JSON.stringify(p.slice(+process.argv[2],+process.argv[2]+ +process.argv[3])))' "$P" "$ST" "$CH")
  playwright-cli -s=$S eval "() => { const \$=window.jQuery; const g=\$('[data-role=grid]').toArray().map(e=>\$(e).data('kendoGrid')).filter(Boolean)[0]; const plan=$CHUNK; let ok=0; const err=[]; for(const [i,d,c] of plan){ const m=g.dataSource.at(i); if(!m){ err.push('no-row:'+i); continue; } m.set('debit',d); m.set('credit',c); ok++; } return JSON.stringify({ok,err}); }" 2>&1 \
    | sed -n '/### Result/,/### Ran/p' | sed -n '2p'
done

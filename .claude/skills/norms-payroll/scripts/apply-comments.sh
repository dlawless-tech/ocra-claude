#!/bin/bash
# Write comments onto entry lines by row index.
# usage: apply-comments.sh <session> <comments.json>     {"5": "22363 Garcia, Rachel", ...}
set -u
S="$1"
C=$(node -e 'process.stdout.write(JSON.stringify(require("fs").readFileSync(process.argv[1],"utf8").trim()))' "$2")
playwright-cli -s=$S eval "() => { const \$=window.jQuery; const g=\$('[data-role=grid]').toArray().map(e=>\$(e).data('kendoGrid')).filter(Boolean)[0]; const c=JSON.parse($C); const out=[]; for (const [i,t] of Object.entries(c)) { const m=g.dataSource.at(+i); m.set('comment',t); out.push(i+':'+m.comment); } return out.join(' / '); }" 2>&1 \
  | sed -n '/### Result/,/### Ran/p' | sed -n 2p

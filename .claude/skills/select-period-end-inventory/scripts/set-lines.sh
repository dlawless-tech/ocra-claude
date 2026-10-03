#!/bin/bash
# Set the open entry's 1210 and 5180 lines to lines.json, matching each line by account.
# usage: set-lines.sh <session> lines.json
set -u
S="$1"; L=$(node -e 'const j=require(require("path").resolve(process.argv[1]));console.log(JSON.stringify(j.lines.map(x=>[x.a.split(" ")[0],x.dr,x.cr])))' "$2")
playwright-cli -s=$S eval "() => { const want=$L; const ds=jQuery('[data-role=grid]').data('kendoGrid').dataSource; const out=[];
  for (let i=0;i<ds.data().length;i++) { const m=ds.at(i); const w=want.find(x=>m.glAccount.startsWith(x[0]+' ')); if(!w) return 'STOP: unexpected line '+m.glAccount; m.set('debit',w[1]); m.set('credit',w[2]); out.push(m.glAccount+' '+m.debit+' '+m.credit); }
  return ds.data().length===want.length ? out.join(' | ') : 'STOP: '+ds.data().length+' lines on the entry'; }" 2>&1 | sed -n '/### Result/{n;p;}'

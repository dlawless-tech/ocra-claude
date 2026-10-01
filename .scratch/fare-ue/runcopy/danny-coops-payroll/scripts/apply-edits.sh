#!/bin/bash
# Write build-plan.js output onto the open entry: amount and comment edits,
# new paper-check lines, and deletion of paper-check lines the week lacks.
# usage: apply-edits.sh <session> <edits.json>
# Kendo's model.set reaches the grid where a scripted cell click does not. A new
# check line is a copy of the entry's direct deposit row, so it inherits the
# 10001 account and the location; all of it reaches the server on Save.
# Deletes go through removeRow: its handler queues the row for the server,
# which a bare dataSource.remove skips.
set -u
S="$1"; P="$2"
E=$(node -e 'const B=String.fromCharCode(92);process.stdout.write(JSON.stringify(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))).split(String.fromCharCode(39)).join(B+"x27"))' "$P")
playwright-cli -s=$S eval "() => { const \$=window.jQuery; const g=\$('[data-role=grid]').toArray().map(e=>\$(e).data('kendoGrid')).filter(Boolean)[0]; const ds=g.dataSource; const p=$E; const err=[];
  const gone=p.deletes.map(i=>ds.at(i));
  const dd=ds.data().find(r=>/^10001 /.test(r.glAccount));
  if(!dd) return JSON.stringify({err:['no 10001 row to copy']});
  const tpl=dd.toJSON();
  let edited=0; for(const [i,d,c,m] of p.edits){ const r=ds.at(i); if(!r){ err.push('no-row:'+i); continue; } r.set('debit',d); r.set('credit',c); r.set('comment',m); edited++; }
  let added=0; for(const [c,m] of p.adds){ const n=Object.assign({},tpl,{debit:0,credit:c,amount:c,total:c,comment:m,transactionDetailId:null,itemVarianceCustomId:null}); ds.add(n); added++; }
  let deleted=0; for(const r of gone){ if(!r){ err.push('no-delete-row'); continue; } g.removeRow(g.tbody.children().filter((_,t)=>t.getAttribute('data-uid')===r.uid)); deleted++; }
  return JSON.stringify({edited,added,deleted,err}); }" 2>&1 \
  | sed -n '/### Result/,/### Ran/p' | sed -n '2p'

#!/bin/bash
# Build one store's weekly entry by duplicating a source entry, check it. Does not approve.
# usage: post-store.sh <session> <lines.json> <uber store> <source TransactionId> [existing copy id]
# Source is any FARE UberEats Fees entry holding lines at this store. Prints the new id, then the check table.
set -u
S="$1"; L="$2"; ST="$3"; SRC="$4"; NUM="UberEats Fees"
D=$(dirname "$0"); SK="$D/../.."
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
ev() { playwright-cli -s=$S eval "$(cat "$1")" 2>&1 | res; }
js() { node -e 'const x=require(require("path").resolve(process.argv[1]));const s=x.stores.find(v=>v.store===process.argv[2]);process.stdout.write(String(process.argv[3]==="we"?x.weekEnding:s[process.argv[3]]))' "$L" "$ST" "$1"; }
WE=$(js we); LOC=$(js loc)

if [ -n "${5:-}" ]; then
  # finish a copy a failed run left behind: open it, date and number it, save
  ID="$5"
  playwright-cli -s=$S goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
  playwright-cli -s=$S fill '#journalEntryDate' "$WE" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
  playwright-cli -s=$S fill '#journalEntryNumber' "$NUM" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
  bash "$SK/danny-coops-payroll/scripts/save.sh" $S | grep -q "\"$ID\"" || { echo "FAIL: save of existing copy"; exit 1; }
else
  ID=$(bash "$D/duplicate.sh" $S "$SRC" "$WE" "$NUM") || { echo "$ID"; exit 1; }
fi
echo "id $ID"

# header location, by name from the combobox's own list
cat > hloc.js <<EOF
() => { const c=jQuery('#journalEntryLocation').data('kendoComboBox');
const it=c.dataSource.data().find(x=>x.locationName==='$LOC'); if(!it) return 'STOP: no location $LOC';
c.value(it.locationId); c.trigger('change');
const s=angular.element(document.getElementById('journalEntryLocation')).scope();
return s.model.location===it.locationId ? 'header '+c.text() : 'STOP: header model '+s.model.location; }
EOF
H=$(ev hloc.js); echo "$H"; echo "$H" | grep -q STOP && exit 1

# other stores' lines: one real trash click wakes the grid, eval clicks take the rest
cat > del.js <<EOF
async () => { const g=jQuery('[data-role=grid]').data('kendoGrid'); let n=0;
for (let i=0;i<120;i++) { const m=g.dataSource.data().find(m=>m.location!=='$LOC'); if(!m) break;
  const el=document.querySelector('tr[data-uid="'+m.uid+'"] .k-grid-delete'); if(!el) return 'STOP: no trash for '+m.glAccount+' after '+n;
  el.click(); n++; await new Promise(r=>setTimeout(r,300)); }
return 'removed '+n+', left '+g.dataSource.data().length; }
EOF
U=$(playwright-cli -s=$S eval "() => (jQuery('[data-role=grid]').data('kendoGrid').dataSource.data().find(m=>m.location!=='$LOC')||{}).uid||''" 2>&1 | res | tr -d '"')
[ -n "$U" ] && { playwright-cli -s=$S click "tr[data-uid=\"$U\"] .k-grid-delete" >/dev/null 2>&1; sleep 2; }
R=$(ev del.js); echo "$R"; echo "$R" | grep -q STOP && exit 1

# no sales: keep the store's template lines at zero, comment header and lines
if [ "$(js zero)" = "true" ]; then
  playwright-cli -s=$S fill '#journalEntryComment' 'no sales this week' >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
  playwright-cli -s=$S eval "() => { const d=jQuery('[data-role=grid]').data('kendoGrid').dataSource.data(); d.forEach(m=>{ m.set('comment','no sales this week'); m.set('debit',0); m.set('credit',0); }); return d.length; }" >/dev/null 2>&1
  OUT=$(bash "$SK/danny-coops-payroll/scripts/save.sh" $S)
  echo "$OUT" | grep -q "\"$ID\"" || { echo "FAIL: save answered $OUT"; exit 1; }
  playwright-cli -s=$S goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
  playwright-cli -s=$S eval "$(cat "$SK/bowery-weekly-mgmt-fees/scripts/read-lines.js")" > readback.txt 2>&1
  node -e 'let s=require("fs").readFileSync("readback.txt","utf8");s=s.slice(s.indexOf("\"{"),s.lastIndexOf("}\"")+2);const e=JSON.parse(JSON.parse(s));const [we,loc]=process.argv.slice(1);const ok=e.date===we&&e.number==="UberEats Fees"&&e.lines.length&&e.lines.every(l=>!l.dr&&!l.cr&&l.loc===loc&&l.c==="no sales this week");console.log(ok?"MATCH":"MISMATCH "+JSON.stringify(e));process.exit(ok?0:1)' "$WE" "$LOC"
  exit $?
fi

# a zero week's source carries the no-sales header comment
playwright-cli -s=$S fill '#journalEntryComment' '' >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1

# the store's own leftovers: zero lines and doubled GLs go, the set step keys the rest
cat > trim.js <<EOF
async () => { const want=$(node -e 'const x=require(require("path").resolve(process.argv[1]));process.stdout.write(JSON.stringify(x.stores.find(v=>v.store===process.argv[2]).lines))' "$L" "$ST");
const g=jQuery('[data-role=grid]').data('kendoGrid'); const out=[];
const rows=Array.prototype.slice.call(g.dataSource.data()); const free=want.slice(); const keep=new Map();
// claim by GL and comment first, then by GL alone
for (const pass of [1,2]) for (const m of rows) { if (keep.has(m)) continue;
  const i=free.findIndex(w=>w.gl===m.glAccount && (pass===2 || (w.comment||'')===(m.comment||''))); if (i<0) continue;
  keep.set(m, free[i]); free.splice(i,1); }
for (const m of rows) { const w=keep.get(m);
  if (w) { m.set(w.side, w.amount); m.set(w.side==='credit'?'debit':'credit', 0); m.set('comment', w.comment); continue; }
  document.querySelector('tr[data-uid="'+m.uid+'"] .k-grid-delete').click(); out.push('removed '+m.glAccount); await new Promise(r=>setTimeout(r,300)); }
return out.join(' ; ') || 'nothing to trim'; }
EOF
ev trim.js

node "$D/add-lines.js" "$L" "$ST" > add.js
A=$(ev add.js); echo "$A"; echo "$A" | grep -q STOP && exit 1
node "$D/set-lines.js" "$L" "$ST" > set.js
R=$(ev set.js); echo "$R"
echo "$R" | grep -q '^"set ' || exit 1
OUT=$(bash "$SK/danny-coops-payroll/scripts/save.sh" $S)
echo "$OUT" | grep -q "\"$ID\"" || { echo "FAIL: save answered $OUT"; exit 1; }

playwright-cli -s=$S goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
playwright-cli -s=$S eval "$(cat "$SK/bowery-weekly-mgmt-fees/scripts/read-lines.js")" > readback.txt 2>&1
node "$D/check-lines.js" "$L" readback.txt "$ST" "$NUM"

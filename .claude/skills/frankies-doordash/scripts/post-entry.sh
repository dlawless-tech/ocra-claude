#!/bin/bash
# Fill one DoorDash entry's five lines by comment, save, reload and read back. Leaves it Unapproved.
# usage: post-entry.sh <session> <TransactionId> <ar> <fees> <mkt> <amd> <diff>
#   ar   = 1230 credit (D - Net), negative for a debit; fees, mkt = debits; amd, diff = signed, + debit / - credit
# The discrepancy line goes on 4105 Sales, Food.
# An Approved entry is unapproved first; approve with approve.sh after checking the read-back.
set -u
S=$1; ID=$2; AR=$3; FEES=$4; MKT=$5; AMD=$6; DIFF=$7
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; HOST=https://frankiesspuntino.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "FAIL $ID: $*"; exit 1; }
SPEC=$(node -e 'const [ar,f,m,a,d]=process.argv.slice(1).map(Number);const dc=v=>v>=0?[v,0]:[0,-v];console.log(JSON.stringify([["doordash receivable",...dc(-ar)],["commissions",f,0],["marketing",m,0],["amendments",...dc(a)],["discrepancy",...dc(d)]]))' -- "$AR" "$FEES" "$MKT" "$AMD" "$DIFF")
TOT=$(node -e 'const s=JSON.parse(process.argv[1]);const dr=s.reduce((t,l)=>t+l[1],0),cr=s.reduce((t,l)=>t+l[2],0);if(Math.abs(dr-cr)>0.005){console.log("UNBAL "+dr.toFixed(2)+" "+cr.toFixed(2));process.exit(1)}console.log(dr.toFixed(2))' "$SPEC") || die "plan does not balance: $TOT"

while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
bash "$HERE/unapprove.sh" $S $ID | grep -q "^unapproved" || die "could not unapprove"
playwright-cli -s=$S goto about:blank >/dev/null 2>&1
playwright-cli -s=$S goto "$HOST/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 16

# rows keyed by comment prefix, case-insensitive; every row must match exactly one spec line
R=$(playwright-cli -s=$S eval "() => { const spec=$SPEC; const g=Array.from(document.querySelectorAll('[data-role=grid]')).map(e=>jQuery(e).data('kendoGrid')).filter(Boolean).find(g=>g.dataSource.data().some(m=>'comment' in m)); if(!g) return 'nogrid'; const rows=Array.from(g.dataSource.data()); for(const l of spec){ const hit=rows.filter(m=>(m.comment||'').trim().toLowerCase().startsWith(l[0])); if(hit.length!==1) return 'rows for '+l[0]+': '+hit.length; hit[0].set('debit',l[1]); hit[0].set('credit',l[2]); } const di=rows.find(m=>(m.comment||'').trim().toLowerCase().startsWith('discrepancy')); di.set('glAccount','4105 - Sales, Food'); di.set('glAccountId','b4eabb45-74a6-ee11-a8ef-002248470496'); let dr=0,cr=0; for(const m of rows){dr+=+m.debit||0; cr+=+m.credit||0;} return JSON.stringify({n:rows.length,dr:dr.toFixed(2),cr:cr.toFixed(2)}); }" 2>&1 | res | sed 's/\\"/"/g')
case "$R" in *"\"dr\":\"$TOT\",\"cr\":\"$TOT\""*) : ;; *) die "set $R want $TOT";; esac

bash "$HERE/ribbon-menu.sh" $S Save "Save" >/dev/null 2>&1; sleep 12
N=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE "^[0-9]+")
B=$(playwright-cli -s=$S response-body $N 2>&1 | grep -E '^\[\[')
case "$B" in *"\"1\",\"$ID\""*) : ;; *) die "save body: $B";; esac
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 16
V=$(playwright-cli -s=$S eval "$(cat "$HERE/read-model.js")" 2>&1 | res)
echo "readback $V"
node -e 'const s=JSON.parse(process.argv[1]);let v=JSON.parse(process.argv[2]);if(typeof v==="string")v=JSON.parse(v);for(const l of s){const r=v.rows.find(r=>r[0].toLowerCase().startsWith(l[0]));if(!r||(l[0]==="discrepancy"&&!/^4105 /.test(r[3]))||Math.abs(r[1]-l[1])>0.005||Math.abs(r[2]-l[2])>0.005){console.error("mismatch "+l[0]);process.exit(1)}}' "$SPEC" "$V" || die "reload readback mismatch"
echo "SAVED $ID $TOT"

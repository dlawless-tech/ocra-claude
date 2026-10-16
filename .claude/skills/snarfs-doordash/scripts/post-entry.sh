#!/bin/bash
# Fill one Snarf's DoorDash entry from a plan.js record, save, reload and read back. Leaves it Unapproved.
# usage: post-entry.sh <session> <TransactionId> <plan.json> <store>
# Five-line template: 10130 credit D-net, commission & fees, marketing spend, amendments (70400), discrepancy D-Sales (42060).
# Two-line template (Spirit): 10130 credit and 70400 debit, both D-net. A negative amount flips its side.
set -u
S=$1; ID=$2; PLAN=$3; STORE=$4; HERE="$(cd "$(dirname "$0")" && pwd)"; HOST=https://snarfsstl.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "FAIL $STORE $ID: $*"; exit 1; }
P=$(node -e 'const p=require(require("path").resolve(process.argv[1])).find(x=>x.store===process.argv[2]);if(!p||p.fail){console.log("");process.exit(1)}console.log(JSON.stringify({ar:p.ar,fees:p.fees,mkt:p.mkt,amd:-p.amd,diff:p.diff}))' "$PLAN" "$STORE") || die "no postable plan for $STORE"

while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
bash "$HERE/unapprove.sh" $S $ID | grep -q "^unapproved" || die "could not unapprove"
playwright-cli -s=$S goto about:blank >/dev/null 2>&1
playwright-cli -s=$S goto "$HOST/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 16

# rows keyed by account (10130, 42060) or comment prefix; every key must hit exactly one row
R=$(playwright-cli -s=$S eval "() => { const p=$P; const g=Array.from(document.querySelectorAll('[data-role=grid]')).map(e=>jQuery(e).data('kendoGrid')).filter(Boolean).find(g=>g.dataSource.data().some(m=>'comment' in m)); if(!g) return 'nogrid';
  const rows=Array.from(g.dataSource.data()); const prior=rows.map(m=>(m.comment||m.glAccount.slice(0,5)).trim()+' '+(+m.debit).toFixed(2)+'/'+(+m.credit).toFixed(2)).join('; ');
  const sd=(m,v)=>{ v=Math.round(v*100)/100; m.set('debit',v>0?v:0); m.set('credit',v<0?-v:0); };
  const one=(f,k)=>{ const h=rows.filter(f); if(h.length!==1) throw new Error('rows for '+k+': '+h.length); return h[0]; };
  try {
    const ar=one(m=>/^10130 /.test(m.glAccount),'10130');
    if(rows.length===2){ sd(ar,-p.ar); sd(one(m=>/^70400 /.test(m.glAccount),'70400'),p.ar); }
    else if(rows.length===5){ sd(ar,-p.ar);
      sd(one(m=>/^commission/i.test((m.comment||'').trim()),'commission'),p.fees);
      sd(one(m=>/^marketing/i.test((m.comment||'').trim()),'marketing'),p.mkt);
      sd(one(m=>/^amend/i.test((m.comment||'').trim()),'amendments'),p.amd);
      sd(one(m=>/^42060 /.test(m.glAccount),'42060'),p.diff); }
    else return 'rows '+rows.length;
  } catch(e) { return e.message; }
  let dr=0,cr=0; for(const m of rows){dr+=+m.debit||0; cr+=+m.credit||0;} return JSON.stringify({n:rows.length,prior,dr:dr.toFixed(2),cr:cr.toFixed(2)}); }" 2>&1 | res | sed 's/\\"/"/g')
echo "set $R"
case "$R" in *'"dr":"'*) DR=$(echo "$R" | grep -oE '"dr":"[0-9.]+"' | cut -d'"' -f4); echo "$R" | grep -q "\"cr\":\"$DR\"" || die "unbalanced $R";; *) die "set $R";; esac

bash "$HERE/ribbon-menu.sh" $S Save "Save" >/dev/null 2>&1; sleep 12
N=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE "^[0-9]+")
B=$(playwright-cli -s=$S response-body $N 2>&1 | grep -E '^\[\[|closed|rror' | head -3)
case "$B" in *"\"1\",\"$ID\""*) : ;; *) die "save body: $B";; esac
playwright-cli -s=$S reload >/dev/null 2>&1
AR=$(node -e 'console.log((+JSON.parse(process.argv[1]).ar).toFixed(2))' "$P")
for i in 1 2 3 4 5 6; do sleep 10
  V=$(playwright-cli -s=$S eval "() => { const g=Array.from(document.querySelectorAll('[data-role=grid]')).map(e=>jQuery(e).data('kendoGrid')).filter(Boolean).find(g=>g.dataSource.data().some(m=>'comment' in m)); if(!g) return ''; const rows=Array.from(g.dataSource.data()); let dr=0; const a=rows.find(m=>/^10130 /.test(m.glAccount)); for(const m of rows) dr+=+m.debit||0; return dr.toFixed(2)+' '+((+a.credit||0)-(+a.debit||0)).toFixed(2) }" 2>&1 | res | tr -d '"')
  [ -n "$V" ] && break; done
[ "$V" = "$DR $AR" ] || die "reload readback '$V' want '$DR $AR'"
echo "SAVED $ID $DR"

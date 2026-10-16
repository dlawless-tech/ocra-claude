#!/bin/bash
# Fill one Snarf's UberEats entry, save, reload and read back. Leaves it Unapproved.
# usage: post-entry.sh <session> <TransactionId> <plan.json> <store>
#    or: post-entry.sh <session> <TransactionId> '<{"ar":..,"mkt":..,"fees":..,"refund":..,"diff":..}>'   (a key left out leaves its line alone)
# ar = 10135 credit; mkt, fees on 70460; refund = the 42060 refund line, diff = the 42060 discrepancy/variance line.
# Positive = debit (credit for ar). Any other line (net order error adjustments) is set to 0.00.
set -u
S=$1; ID=$2; P=$3; STORE=${4:-}; HERE="$(cd "$(dirname "$0")" && pwd)"; HOST=https://snarfsstl.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "FAIL $ID: $*"; exit 1; }
if [ -f "$P" ]; then
  P=$(node -e 'const p=require(require("path").resolve(process.argv[1])).find(x=>x.store===process.argv[2]);if(!p||p.fail)process.exit(1);console.log(JSON.stringify({ar:p.ar,mkt:p.mkt,fees:p.fees,refund:p.refund,diff:p.diff,others:0}))' "$P" "$STORE") || die "no postable plan for $STORE"
fi
node -e 'const p=JSON.parse(process.argv[1]); if(typeof p.ar!=="number") process.exit(1)' "$P" || die "bad lines json"

while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
bash "$HERE/unapprove.sh" $S $ID | grep -q "^unapproved" || die "could not unapprove"
playwright-cli -s=$S goto about:blank >/dev/null 2>&1
playwright-cli -s=$S goto "$HOST/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 16

# 10135 by account; 70460 lines by comment; 42060 discrepancy/variance line vs the other 42060 line
R=$(playwright-cli -s=$S eval "() => { const p=$P; const g=Array.from(document.querySelectorAll('[data-role=grid]')).map(e=>jQuery(e).data('kendoGrid')).filter(Boolean).find(g=>g.dataSource.data().some(m=>'comment' in m)); if(!g) return 'nogrid';
  const rows=Array.from(g.dataSource.data()).filter(m=>m.glAccount); const cm=m=>(m.comment||'').trim();
  const prior=rows.map(m=>(cm(m)||m.glAccount.slice(0,5))+' '+(+m.debit).toFixed(2)+'/'+(+m.credit).toFixed(2)).join('; ');
  const sd=(m,v)=>{ v=Math.round(v*100)/100; m.set('debit',v>0?v:0); m.set('credit',v<0?-v:0); };
  const one=(f,k)=>{ const h=rows.filter(f); if(h.length!==1) throw new Error('rows for '+k+': '+h.length); return h[0]; };
  const is42=m=>/^42060 /.test(m.glAccount), isDiff=m=>/discrep|variance/i.test(cm(m));
  try {
    sd(one(m=>/^10135 /.test(m.glAccount),'10135'),-p.ar);
    if('mkt' in p) sd(one(m=>/^70460 /.test(m.glAccount)&&/^marketing/i.test(cm(m)),'marketing'),p.mkt);
    if('fees' in p) sd(one(m=>/^70460 /.test(m.glAccount)&&/uber fees/i.test(cm(m)),'uber fees'),p.fees);
    if('refund' in p) sd(one(m=>is42(m)&&!isDiff(m),'42060 adjustment'),p.refund);
    if('diff' in p) sd(one(m=>is42(m)&&isDiff(m),'discrepancy'),p.diff);
    if('others' in p) for(const m of rows) if(!/^10135 /.test(m.glAccount)&&!is42(m)&&!/^marketing/i.test(cm(m))&&!/uber fees/i.test(cm(m))) sd(m,0);
  } catch(e) { return e.message+' | '+prior; }
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
  V=$(playwright-cli -s=$S eval "() => { const g=Array.from(document.querySelectorAll('[data-role=grid]')).map(e=>jQuery(e).data('kendoGrid')).filter(Boolean).find(g=>g.dataSource.data().some(m=>'comment' in m)); if(!g) return ''; const rows=Array.from(g.dataSource.data()); let dr=0; const a=rows.find(m=>/^10135 /.test(m.glAccount)); for(const m of rows) dr+=+m.debit||0; return dr.toFixed(2)+' '+((+a.credit||0)-(+a.debit||0)).toFixed(2) }" 2>&1 | res | tr -d '"')
  [ -n "$V" ] && break; done
[ "$V" = "$DR $AR" ] || die "reload readback '$V' want '$DR $AR'"
echo "SAVED $ID $DR"

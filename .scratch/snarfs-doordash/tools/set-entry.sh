#!/bin/bash
# Set a two-line Snarf's DoorDash entry: Cr 10130 <ar>, Dr 70400 <ar> (negative ar flips both). Save, reload, read back. Leaves it Unapproved.
# usage: set-entry.sh <session> <TransactionId> <ar>
set -u
S=$1; ID=$2; AR=$3; HERE="$(cd "$(dirname "$0")" && pwd)"; HOST=https://snarfsstl.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "FAIL $ID: $*"; exit 1; }
while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
bash "$HERE/unapprove.sh" $S $ID | grep -q "^unapproved" || die "could not unapprove"
playwright-cli -s=$S goto about:blank >/dev/null 2>&1
playwright-cli -s=$S goto "$HOST/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 16
R=$(playwright-cli -s=$S eval "() => { const ar=$AR; const g=Array.from(document.querySelectorAll('[data-role=grid]')).map(e=>jQuery(e).data('kendoGrid')).filter(Boolean).find(g=>g.dataSource.data().some(m=>'comment' in m)); if(!g) return 'nogrid'; const rows=Array.from(g.dataSource.data()); if(rows.length!==2) return 'rows '+rows.length;
  const a=rows.find(m=>/^10130 /.test(m.glAccount)), f=rows.find(m=>/^70400 /.test(m.glAccount)); if(!a||!f) return 'accounts '+rows.map(m=>m.glAccount);
  a.set('debit',ar<0?-ar:0); a.set('credit',ar>0?ar:0); f.set('debit',ar>0?ar:0); f.set('credit',ar<0?-ar:0);
  let dr=0,cr=0; for(const m of rows){dr+=+m.debit||0; cr+=+m.credit||0;} return dr.toFixed(2)+'/'+cr.toFixed(2); }" 2>&1 | res | tr -d '"')
W=$(node -e 'console.log(Math.abs(+process.argv[1]).toFixed(2))' -- "$AR")
[ "$R" = "$W/$W" ] || die "set $R want $W"
bash "$HERE/ribbon-menu.sh" $S Save "Save" >/dev/null 2>&1; sleep 12
N=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE "^[0-9]+")
B=$(playwright-cli -s=$S response-body $N 2>&1 | grep -E '^\[\[|closed|rror' | head -3)
case "$B" in *"\"1\",\"$ID\""*) : ;; *) die "save body: $B";; esac
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 16
V=$(playwright-cli -s=$S eval "() => { const g=Array.from(document.querySelectorAll('[data-role=grid]')).map(e=>jQuery(e).data('kendoGrid')).filter(Boolean).find(g=>g.dataSource.data().some(m=>'comment' in m)); return g.dataSource.data().map(m=>m.glAccount.slice(0,5)+':'+(+m.debit).toFixed(2)+'/'+(+m.credit).toFixed(2)).join(' ') }" 2>&1 | res | tr -d '"')
echo "readback $V"
case "$V" in *"10130:"*"$W"*) echo "SAVED $ID $W";; *) die "readback";; esac

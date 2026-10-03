#!/bin/bash
# fix.sh <session> <arCredit> <diffCr> <tot>  (entry already open + Unapproved)
set -u
S="$1"; ARC="$2"; DFC="$3"; TOT="$4"
H=.claude/skills/bowery-ubereats/scripts
AR="a/r debit from prior week less total payout"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n"'; }
die() { echo "FAIL: $*"; exit 1; }
n2() { printf "%.2f" "$(echo "$1" | sed 's/,//g')"; }
ST=$(playwright-cli -s=$S eval "() => (document.body.innerText.match(/Unapproved|Approved/)||['?'])[0]" 2>&1 | res)
[ "$ST" = "Unapproved" ] || die "status $ST"
TMP=$(mktemp); bash $H/snapshot.sh $S $TMP
LN=$(grep -n 'gridcell "uber fees"' $TMP | head -1 | cut -d: -f1); [ -n "$LN" ] || die "no grid"
W=$(sed -n "$((LN-1))p" $TMP | grep -oE 'ref=[a-zA-Z0-9]+' | head -1 | cut -d= -f2)
playwright-cli -s=$S click $W >/dev/null 2>&1; sleep 2; playwright-cli -s=$S press Escape >/dev/null 2>&1; sleep 1
fill() { # label amount  (credit column)
  R=$(playwright-cli -s=$S eval "() => { const r=Array.from(document.querySelectorAll('tr')).find(x=>Array.from(x.cells||[]).some(c=>c.innerText.trim()==='$1')); if(!r) return 'ERR'; const c=Array.from(r.cells); const i=c.findIndex(x=>x.innerText.trim()==='$1'); c[i-1].click(); return 'ok'; }" 2>&1 | res)
  [ "$R" = "ok" ] || die "click $1 $R"; sleep 2
  playwright-cli -s=$S fill 'input[name="credit"]' "$2" >/dev/null 2>&1
  playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Escape >/dev/null 2>&1; sleep 1
}
rows() { playwright-cli -s=$S eval "() => { const rows=Array.from(document.querySelectorAll('tr')).map(r=>Array.from(r.cells||[]).map(c=>c.innerText.trim())); let dr=0,cr=0,o=[]; for(const l of ['$AR','uber fees','difference','marketing']){ const t=rows.find(x=>x.includes(l)); if(!t) return 'MISSING '+l; const i=t.indexOf(l); const d=parseFloat(t[i-2].replace(/,/g,''))||0, c=parseFloat(t[i-1].replace(/,/g,''))||0; dr+=d; cr+=c; o.push(l.slice(0,5)+' '+d.toFixed(2)+'/'+c.toFixed(2)); } return o.join(' | ')+' || '+dr.toFixed(2)+'/'+cr.toFixed(2); }" 2>&1 | res; }
fill "$AR" "$ARC"
fill "difference" "$DFC"
B=$(rows); echo "pre-save: $B"
case "$B" in *"a/r d 0.00/$(n2 $ARC)"*"diffe 0.00/$(n2 $DFC)"*"|| $(n2 $TOT)/$(n2 $TOT)") : ;; *) die "pre-save mismatch";; esac
bash $H/ribbon-menu.sh $S Save Save >/dev/null 2>&1; sleep 12
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14
A=$(rows); echo "after reload: $A"
[ "$A" = "$B" ] || die "save did not land"
bash $H/ribbon-menu.sh $S Approve "Approve and Close" >/dev/null 2>&1; sleep 14
echo DONE

#!/bin/bash
# Fill or correct one NORMS DoorDash entry: unapprove if Approved, set lines, save, reload, verify, approve.
# usage: post-entry.sh <session> <TransactionId> '<json {comment:[debit,credit],...}>'
# Lines not named keep their amounts. Refuses to approve unless the reload shows every set
# amount and both sides balance. Serves a new week (templates arrive Approved at 0.00) and a correction.
set -u
S="$1"; ID="$2"; SET="$3"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "$ID FAIL: $*"; exit 1; }
ev() { playwright-cli -s=$S eval "$1" 2>&1 | res; }
SETJ=$(node -e 'process.stdout.write(JSON.stringify(JSON.stringify(JSON.parse(process.argv[1]))))' "$SET")
READ="() => { const g=window.jQuery('[data-role=grid]').data('kendoGrid'); if(!g) return 'nogrid'; const st=document.querySelector('#Unapprove')?'Approved':'Unapproved'; return JSON.stringify({st, lines:g.dataSource.data().map(m=>[m.comment,m.debit,m.credit])}); }"
CHECK="() => { const W=JSON.parse($SETJ); const g=window.jQuery('[data-role=grid]').data('kendoGrid'); const d=g.dataSource.data().toJSON(); let dr=0,cr=0; for(const m of d){dr+=+m.debit||0; cr+=+m.credit||0;} const bad=Object.entries(W).filter(([c,v])=>{const m=d.find(x=>x.comment===c); return !m||Math.abs((+m.debit||0)-v[0])>0.005||Math.abs((+m.credit||0)-v[1])>0.005;}).map(x=>x[0]); return bad.length?'BAD:'+bad.join(','):(Math.abs(dr-cr)<0.005?'OK '+dr.toFixed(2):'UNBAL '+dr.toFixed(2)+'/'+cr.toFixed(2)); }"

playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 12
B=$(ev "$READ"); echo "$ID before: $B"
case "$B" in *'"st":"Approved"'*)
  playwright-cli -s=$S click '#Unapprove > a' >/dev/null 2>&1; sleep 2
  playwright-cli -s=$S click 'li[data-testid="unapproveMenuItem"]' >/dev/null 2>&1; sleep 10
  N=$(playwright-cli -s=$S requests 2>&1 | grep 'Transaction/UnApprove' | tail -1 | grep -oE '^[0-9]+')
  [ -n "$N" ] && playwright-cli -s=$S response-body $N 2>&1 | grep -q 'unapproved successfully' || die "unapprove not confirmed"
  playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14 ;;
esac
R=$(ev "() => { const W=JSON.parse($SETJ); const g=window.jQuery('[data-role=grid]').data('kendoGrid'); const d=g.dataSource.data(); const miss=[]; for(const [c,v] of Object.entries(W)){ const m=d.find(x=>x.comment===c); if(!m){miss.push(c);continue;} m.set('debit',v[0]); m.set('credit',v[1]); } return miss.length?'MISS:'+miss.join(','):'set'; }")
[ "$R" = '"set"' ] || die "set: $R"
C=$(ev "$CHECK"); case "$C" in *OK*) echo "$ID pre-save $C";; *) die "pre-save $C";; esac

playwright-cli -s=$S hover "#Save > a" >/dev/null 2>&1; sleep 2
ev "() => { const li=document.querySelector('#Save li[data-testid=\"saveMenuItem\"]'); const sc=window.angular.element(li).scope(); sc.\$apply(() => sc.subMenu.handler()); return sc.subMenu.title; }" >/dev/null
sleep 10
N=$(playwright-cli -s=$S requests 2>&1 | grep 'SaveTransaction' | tail -1 | grep -oE '^[0-9]+')
SB=$( [ -n "$N" ] && playwright-cli -s=$S response-body $N 2>&1 | grep -E '^\[\[' )
case "$SB" in '[["1",'*) : ;; *) die "save rejected: $SB";; esac
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14
C=$(ev "$CHECK"); case "$C" in *OK*) echo "$ID after reload $C";; *) die "after reload $C";; esac

# a save can land with the entry still Approved; the ribbon says which
case "$(ev "() => !!document.querySelector('#Unapprove')")" in true) echo "$ID DONE (Approved)"; exit 0;; esac
playwright-cli -s=$S click '#Approve > a' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click 'li[data-testid="approveAndCloseMenuItem"]' >/dev/null 2>&1; sleep 14
N=$(playwright-cli -s=$S requests 2>&1 | grep 'Transaction/Approve' | tail -1 | grep -oE '^[0-9]+')
[ -n "$N" ] && playwright-cli -s=$S response-body $N 2>&1 | grep 'Successfully Approved' | grep -q "$ID" || die "approve not confirmed"
echo "$ID DONE"

#!/bin/bash
# Fill one Credit Card Fees entry: unapprove, set both lines, save, approve and close, then reopen and read back.
# usage: post-entry.sh <session> <TransactionId> <accrual>
# Prints each step's response, the read-back, then OK or MISMATCH. Exit 1 on a step that did not take.
S="$1"; ID="$2"; AMT="$3"
URL="https://cucinacolore.restaurant365.com/#/form/JournalEntryForm/$ID"
res() { sed -n '/### Result/,/### Ran/p' | sed '1d;$d'; }
lines() { playwright-cli -s=$S eval "() => { const g=window.jQuery && jQuery('[data-role=grid]').data('kendoGrid'); return g ? g.dataSource.data().length : 0; }" 2>&1 | res; }
open() { playwright-cli -s=$S goto "$URL" >/dev/null 2>&1
  for i in $(seq 1 20); do sleep 2; R=$(lines); [ "$R" -ge 2 ] 2>/dev/null && return 0; done; return 1; }
# body of the newest request matching $1, waiting up to 20s for it to land
body() { for i in $(seq 1 10); do
    N=$(playwright-cli -s=$S requests 2>&1 | grep "$1" | tail -1 | grep -oE '^[^0-9]*[0-9]+' | grep -oE '[0-9]+$')
    [ -n "$N" ] && { playwright-cli -s=$S response-body $N 2>&1 | grep -E '^[[{"]' | tail -1 | head -c 400; return; }
    sleep 2; done; }
ribbon() { playwright-cli -s=$S eval "() => ['Approve','Unapprove'].filter(x=>document.getElementById(x)).join(',')" 2>&1 | res | tr -d '"'; }

open || { echo "FAIL nogrid"; exit 1; }

# unapprove when still Approved
if [ "$(ribbon)" = "Unapprove" ]; then
  playwright-cli -s=$S click '#Unapprove > a' >/dev/null 2>&1; sleep 1
  playwright-cli -s=$S click 'li[data-testid="unapproveMenuItem"]' >/dev/null 2>&1; sleep 4
  U=$(body 'UnApprove'); echo "unapprove: $U"
  case "$U" in *unapproved*) ;; *) echo "FAIL unapprove"; exit 1;; esac
  playwright-cli -s=$S reload >/dev/null 2>&1; sleep 4
  open || { echo "FAIL nogrid after unapprove"; exit 1; }
fi
[ "$(ribbon)" = "Approve" ] || { echo "FAIL still approved"; exit 1; }

SET=$(playwright-cli -s=$S eval "() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); let n=0; g.dataSource.data().forEach(m=>{ const a=String(m.glAccount||''); if(/^91000 /.test(a)){m.set('debit',$AMT);m.set('credit',0);n++;} if(/^20500 /.test(a)){m.set('credit',$AMT);m.set('debit',0);n++;} }); return n; }" 2>&1 | res)
[ "$SET" = "2" ] || { echo "FAIL set $SET"; exit 1; }

playwright-cli -s=$S hover '#Save > a' >/dev/null 2>&1; sleep 1
playwright-cli -s=$S eval "() => { const li=document.querySelector('#Save li[data-testid=\"saveMenuItem\"]'); const sc=window.angular.element(li).scope(); sc.\$apply(() => sc.subMenu.handler()); return sc.subMenu.title; }" >/dev/null 2>&1; sleep 5
SV=$(body 'SaveTransaction'); echo "save: $SV"
case "$SV" in *"[[\"1\",\"$ID\""*|*'[["1",'*) ;; *) echo "FAIL save"; exit 1;; esac

playwright-cli -s=$S click '#Approve > a' >/dev/null 2>&1; sleep 1
playwright-cli -s=$S click 'li[data-testid="approveAndCloseMenuItem"]' >/dev/null 2>&1; sleep 5
AP=$(body 'Transaction/Approve'); echo "approve: $AP"
case "$AP" in *"Successfully Approved"*) ;; *) echo "FAIL approve"; exit 1;; esac

# goto on the same hash keeps the stale page
playwright-cli -s=$S reload >/dev/null 2>&1
R=0; for i in $(seq 1 20); do sleep 2; R=$(lines); [ "$R" -ge 2 ] 2>/dev/null && break; done
[ "$R" -ge 2 ] 2>/dev/null || { echo "FAIL nogrid on read-back"; exit 1; }
RB=$(playwright-cli -s=$S eval "() => jQuery('[data-role=grid]').data('kendoGrid').dataSource.data().map(m=>String(m.glAccount).slice(0,5)+':'+m.debit+':'+m.credit).join(' ')" 2>&1 | res | tr -d '"')
echo "readback: $RB status: $(ribbon | sed 's/Unapprove/Approved/;s/^Approve$/Unapproved/')"
[ "$(ribbon)" = "Unapprove" ] || { echo "MISMATCH not approved"; exit 1; }
node -e 'const [rb,a]=process.argv.slice(1);const ok=rb.split(" ").every(x=>{const [acct,d,c]=x.split(":");return acct=="91000"?(+d==+a&&+c==0):acct=="20500"?(+c==+a&&+d==0):false});console.log(ok?"OK":"MISMATCH");process.exit(ok?0:1)' "$RB" "$AMT"

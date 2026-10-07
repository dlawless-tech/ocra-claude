#!/bin/bash
# Fill one Approved CC Fee Accrual entry through Edit / Edit Complete, then reload and read back.
# usage: post-approved.sh <session> <TransactionId> <accrual>
# Prints the SaveTransaction body, the read-back, then OK or MISMATCH. Exit 1 on a step that did not take.
S="$1"; ID="$2"; AMT="$3"
res() { sed -n '/### Result/,/### Ran/p' | sed '1d;$d'; }
lines() { playwright-cli -s=$S eval "() => { const g=window.jQuery && jQuery('[data-role=grid]').data('kendoGrid'); return g ? g.dataSource.data().length : 0; }" 2>&1 | res; }

playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1
for i in $(seq 1 20); do sleep 2; R=$(lines); [ "$R" -ge 2 ] 2>/dev/null && break; done
[ "$R" -ge 2 ] 2>/dev/null || { echo "FAIL nogrid"; exit 1; }

playwright-cli -s=$S click 'button.btn-default:has-text("Edit")' >/dev/null 2>&1; sleep 2
B=$(playwright-cli -s=$S eval "() => Array.from(document.querySelectorAll('button.btn-default')).map(b=>b.innerText.trim()).filter(t=>/Edit/.test(t)).join('|')" 2>&1 | res)
case "$B" in *"Edit Complete"*) ;; *) echo "FAIL noedit $B"; exit 1;; esac

SET=$(playwright-cli -s=$S eval "() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); let n=0; g.dataSource.data().forEach(m=>{ const a=String(m.glAccount||''); if(/^5510 /.test(a)){m.set('debit',$AMT);m.set('credit',0);n++;} if(/^2016 /.test(a)){m.set('credit',$AMT);m.set('debit',0);n++;} }); return n; }" 2>&1 | res)
[ "$SET" = "2" ] || { echo "FAIL set $SET"; exit 1; }

playwright-cli -s=$S click 'button.btn-default:has-text("Edit Complete")' >/dev/null 2>&1; sleep 4
N=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE '^[^0-9]*[0-9]+' | grep -oE '[0-9]+$')
echo "save: $(playwright-cli -s=$S response-body $N 2>&1 | grep -oE '\[\["[0-9]+"[^]]*\]' | head -1)"

playwright-cli -s=$S reload >/dev/null 2>&1
for i in $(seq 1 20); do sleep 2
  RB=$(playwright-cli -s=$S eval "() => { const g=window.jQuery && jQuery('[data-role=grid]').data('kendoGrid'); if(!g||g.dataSource.data().length<2) return ''; return g.dataSource.data().map(m=>String(m.glAccount).slice(0,4)+':'+m.debit+':'+m.credit).join(' '); }" 2>&1 | res | tr -d '"')
  [ -n "$RB" ] && break; done
echo "readback: $RB"
node -e 'const [rb,a]=process.argv.slice(1);const ok=rb.split(" ").every(x=>{const [acct,d,c]=x.split(":");return acct=="5510"?(+d==+a&&+c==0):acct=="2016"?(+c==+a&&+d==0):false});console.log(ok?"OK":"MISMATCH");process.exit(ok?0:1)' "$RB" "$AMT"

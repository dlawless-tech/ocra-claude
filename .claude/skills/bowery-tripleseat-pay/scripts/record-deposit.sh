#!/bin/bash
# Record one unmatched Paysafe bank line as a Bank Deposit at net to 253-00, from Bank Activity.
# Usage: record-deposit.sh <session> <store> <bank amount> <bank date M/D/YYYY>
# Needs Bank Activity open on the store's account (bank-lines.sh). post-payout.sh then splits it.
# Prints CREATED <TransactionId>, LEFT: when credits and reversals cancel, or FAIL:/STOP:
# saying whether anything was created.
set -u
S="$1"; STORE="$2"; AMT="$3"; BD="$4"; B="playwright-cli -s=$S"
K="$(dirname "$0")"; . "$K/stores.sh"; store_conf "$STORE"
ADD="$K/../../norms-stripe-deposits/scripts/add-lines.sh"
unq() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s.trim())))}catch(e){process.stdout.write(s)}})'; }
act() { local what="$1"; shift; $B "$@" 2>&1 | grep -q '### Error' && { echo "FAIL: $what (not created)"; exit 1; }; :; }

# credits less same-day Paysafe reversals of this amount: 0 = they cancel, leave them; 1 = record
ROWS=$($B eval "() => { const md=d=>(d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear(); const p=jQuery('#BankActivityUnmatchedGrid').data('kendoGrid').dataSource.data().toJSON().filter(r=>/PAYSAFE/i.test(r.Memo||'')&&Math.abs(Math.round(r.Amount*100))===Math.round($AMT*100)&&md(new Date(r.Date))==='$BD');
return p.filter(r=>r.Amount>0).length+'/'+p.filter(r=>r.Amount<0).length; }" 2>&1 | res | unq)
C=${ROWS%/*}; RV=${ROWS#*/}
[ "$C" -gt 0 ] && [ "$C" = "$RV" ] 2>/dev/null && { echo "LEFT: $AMT on $BD credits and reversals cancel ($ROWS), payout not received (not created)"; exit 2; }
[ "$((C-RV))" = 1 ] 2>/dev/null || { echo "STOP: $AMT on $BD has credits/reversals $ROWS (not created)"; exit 1; }
cat > record-plan.json <<J
{ "lines": [ { "account": "253-00", "amount": $AMT, "location": "$LOC_NO", "comment": "" } ] }
J

act 'Deposit link' click "#BankActivityUnmatchedGrid tbody tr:has-text('$(printf "%'.2f" "$AMT")'):has-text('$BD ') a:text-is('Deposit')"; sleep 10
HD=$($B eval "() => { const w=[...document.querySelectorAll('.k-window')].find(x=>/Create Deposit/.test(x.innerText)&&getComputedStyle(x).display!=='none'); return w ? w.querySelector('#bankDepositDate').value : 'no window'; }" 2>&1 | res | unq)
[ "$HD" = "$BD" ] || { echo "FAIL: deposit window date $HD, bank $BD (not created)"; exit 1; }
bash "$ADD" $S record-plan.json || { echo "(not created)"; exit 1; }
TOT=$($B eval "() => (jQuery('#bankDepositDetailsGrid').data('kendoGrid').dataSource.data().toJSON().reduce((s,r)=>s+Math.round(r.total*100),0)/100).toFixed(2)" 2>&1 | res | unq)
[ "$TOT" = "$(printf '%.2f' "$AMT")" ] || { echo "FAIL: adjustments total $TOT, bank $AMT (not created)"; exit 1; }

LAST=$($B requests 2>&1 | grep 'SaveDeposit' | tail -1 | grep -oE '^[0-9]+')
act 'Create Deposit' click '[data-testid=createDepositMenuItem] >> visible=true'
IDX=""; for i in $(seq 1 20); do sleep 2; IDX=$($B requests 2>&1 | grep 'SaveDeposit' | tail -1 | grep -oE '^[0-9]+'); [ -n "$IDX" ] && [ "$IDX" != "${LAST:-}" ] && break; IDX=""; done
[ -n "$IDX" ] || { echo "FAIL: Create Deposit sent no save (check the bank line before rerunning)"; exit 1; }
ID=$($B response-body "$IDX" 2>&1 | grep -oE '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' | head -1 | tr 'A-F' 'a-f')
[ -n "$ID" ] || { echo "FAIL: save answered $($B response-body "$IDX" 2>&1 | grep -oE '\[.*\]' | head -1)"; exit 1; }
echo "CREATED $ID"

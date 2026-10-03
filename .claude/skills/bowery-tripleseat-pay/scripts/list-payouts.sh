#!/bin/bash
# Print a store's Tripleseat Pay payouts back to a date, newest first.
# Usage: list-payouts.sh <session> <store> <since YYYY-MM-DD>
# Output: <payout date YYYY-MM-DD> | <po_id> | <net>
set -u
S="$1"; STORE="$2"; SINCE="$3"; T="playwright-cli -s=$S"
. "$(dirname "$0")/stores.sh"; store_conf "$STORE"
ref() { $T snapshot 2>&1 | grep -F "$1" | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2 | head -1; }
$T goto https://partypay.paymentsonline.io/payouts >/dev/null 2>&1; sleep 8
# picker shows one store at a time
$T click "$(ref 'combobox "store')" >/dev/null 2>&1; sleep 3
$T click "$(ref "option \"store $PORTAL_NAME ")" >/dev/null 2>&1; sleep 8
CUR=$($T eval "() => document.querySelector('[role=combobox]')?.innerText || ''" 2>&1 | res)
echo "$CUR" | grep -qF "$PORTAL_NAME" || { echo "FAIL: store picker reads $CUR"; exit 1; }
for page in 1 2 3 4 5; do
  ROWS=$($T eval "() => document.body.innerText" 2>&1 | unjson | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const m=[...s.matchAll(/([A-Z][a-z]{2} \d+, \d{4}), [\d:]+ [AP]M\s+(po_\w+)\s+PAID\s+\d+\s+\$([\d,.]+)/g)];
      m.forEach(x=>{const d=new Date(x[1]);console.log(d.toISOString().slice(0,10)+" | "+x[2]+" | "+x[3].replace(/,/g,""))})})')
  [ -n "$ROWS" ] || { echo "FAIL: no payout rows on page $page"; exit 1; }
  echo "$ROWS" | awk -F' [|] ' -v s="$SINCE" '$1>=s'
  OLDEST=$(echo "$ROWS" | tail -1 | cut -d' ' -f1)
  [[ "$OLDEST" < "$SINCE" ]] && exit 0
  $T click 'button[aria-label="Next page"]' >/dev/null 2>&1; sleep 6
done

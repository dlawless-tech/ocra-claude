#!/bin/bash
# Print every dLena Toast ticket for one business day paid by a deposit, event or prepaid payment.
# usage: toast-day.sh <session> <YYYYMMDD>
# Opens the day's Sales Summary, follows its Orders link into the legacy report, then walks Order Details.
SK=$(cd "$(dirname "$0")" && pwd)
S=$1; D=$2; LOC='DCDO2evPTr2voXV2Bv/uWQ=='
res() { sed -n '/### Result/{n;p;q;}'; }
busy() { echo "$1" | grep -q 'Modal state' && { playwright-cli -s=$S dialog-accept >/dev/null 2>&1; sleep 90; return 0; }; return 1; }
playwright-cli -s=$S dialog-accept >/dev/null 2>&1
playwright-cli -s=$S goto "https://www.toasttab.com/restaurants/admin/reports/sales/sales-summary?startDate=$D&endDate=$D&locations=$LOC" >/dev/null 2>&1; sleep 20
playwright-cli -s=$S eval "() => { const a=Array.from(document.querySelectorAll('a')).find(a=>/legacyReports\/sales#sales-orders/.test(a.getAttribute('href')||'')); a.click(); return 1; }" >/dev/null 2>&1
H=$(playwright-cli -s=$S eval "() => location.hostname" 2>&1 | res | tr -d '"')
[ "$H" = "www.toasttab.com" ] || { echo "FAIL: Toast is signed out ($H); the human signs in to the open window"; exit 1; }
WANT="${D:4:2}-${D:6:2}-${D:0:4}"
for i in $(seq 1 12); do sleep 5; V=$(playwright-cli -s=$S eval "() => (document.querySelector('input[name=reportDateStart]')||{}).value + ' ' + ((document.querySelector('#sales-orders')||{innerText:''}).innerText.match(/Showing[^\n]*/)||[''])[0]" 2>&1); busy "$V" && continue; echo "$V" | grep -q "$WANT Showing" && break; done
echo "$V" | grep -q "$WANT Showing" || { echo "FAIL: Orders report did not open on $WANT"; exit 1; }
for t in 1 2 3; do O=$(playwright-cli -s=$S eval "$(cat "$SK/toast-payments.js")" 2>&1); busy "$O" && continue; break; done
echo "$O" | res | node "$SK/toast-filter.js"

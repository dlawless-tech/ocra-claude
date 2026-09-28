#!/bin/bash
# Retrieve one bank account's activity on the open Bank Activity page.
# Usage: retrieve-account.sh <session> <account index, 1-based> <start M/D/YYYY> <end M/D/YYYY>
# Prints one line: RETRIEVED | SKIPPED | END | FAIL, with the account name.
set -u
S="$1"; N="$2"; START="$3"; END="$4"
res() { sed -n '/### Result/{n;p;}' | sed 's/^"//; s/"$//'; }
js() { playwright-cli -s=$S eval "$1" 2>&1 | res; }
click() { playwright-cli -s=$S click "$1" 2>&1 | grep -q '### Error' && { echo "FAIL: ${NAME:-account #$N} click $1"; exit 1; }; :; }
LIST='#bankActivityBankAcounts_listbox li'

# warning popup: read from the DOM, since snapshots miss it and its overlay eats clicks
warning() { js "() => [...document.querySelectorAll('.r365-confirmation-popup-window')].some(w=>getComputedStyle(w).display!=='none') ? 'yes' : 'no'"; }
# poll a few seconds for the "already refreshed today" warning and answer No
answer_no() {
  for i in 1 2 3 4 5 6; do
    [ "$(warning)" = yes ] && { click '.r365-confirmation-popup-window button[data-testid=cancelText] >> visible=true'; sleep 3; return; }
    sleep 2
  done
}

NAME=$(js "() => { const li=document.querySelectorAll('$LIST')[$N-1]; return li ? li.innerText.trim() : ''; }")
[ -n "$NAME" ] || { echo "END: no account #$N"; exit 0; }

[ "$(warning)" = yes ] && answer_no
# the arrow sometimes ignores a click; retry until the list shows
for i in 1 2 3 4; do
  [ "$(js "() => getComputedStyle(document.getElementById('bankActivityBankAcounts-list')).display")" = block ] && break
  click '[aria-controls=bankActivityBankAcounts_listbox]'; sleep 3
done
click "$LIST >> nth=$((N-1))"; sleep 4
answer_no
GOT=$(js "() => document.querySelector('input[name=bankActivityBankAcounts_input]').value")
[ "$GOT" = "$NAME" ] || { echo "FAIL: $NAME did not take (shows $GOT)"; exit 1; }

# Connected | Not Connected | Password Needed; only one block shows
STATUS=$(js "() => [...document.querySelectorAll('.connectionStatus')].map(p=>p.parentElement).filter(d=>!d.classList.contains('ng-hide')).map(d=>d.querySelector('strong').innerText.trim()).join(',')")
[ "$STATUS" = "Connected" ] || { echo "SKIPPED: $NAME (${STATUS:-no status})"; exit 0; }

click '[data-testid=chooseDateRangeButton]'; sleep 3
playwright-cli -s=$S fill '#start' "$START" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
playwright-cli -s=$S fill '#end' "$END" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
GOT=$(js "() => ['start','end'].map(i=>{const w=jQuery('#'+i).data('kendoDatePicker'); const d=w&&w.value(); return d?(d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear():'null';}).join(' ')")
[ "$GOT" = "$START $END" ] || { echo "FAIL: $NAME dates read back $GOT"; exit 1; }

# requests accumulate across accounts, so wait for one newer than the last
last_retrieve() { playwright-cli -s=$S requests 2>&1 | grep 'RetrieveBankActivityForGlAccount' | tail -1 | grep -oE '^[0-9]+'; }
LAST_IDX=$(last_retrieve)
click "button[ng-click=\"handlers.retrieveActivity('startEndDate')\"]"
IDX=""
for i in $(seq 1 40); do
  sleep 3
  IDX=$(last_retrieve)
  [ -n "$IDX" ] && [ "$IDX" != "${LAST_IDX:-}" ] && break
  IDX=""
done
[ -n "$IDX" ] || { echo "FAIL: $NAME retrieve sent no request"; exit 1; }
BODY=$(playwright-cli -s=$S response-body "$IDX" 2>&1 | grep -oE '\{.*\}' | tail -1)
answer_no
echo "RETRIEVED: $NAME $BODY"

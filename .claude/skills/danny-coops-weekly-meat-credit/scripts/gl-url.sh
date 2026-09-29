#!/bin/bash
# Run the Meat Credit P&L view and save its 52300 drill-down url to glurl.txt.
# usage: gl-url.sh <session>
# The GL Account Detail url only renders with the session's own User and
# SQLServer params, so take it from a real drill-down; week-invoices.sh reuses it.
set -u
S="$1"
LOGIN="$(dirname "$0")/../../danny-coops-payroll/scripts/r365-login.sh"
res() { sed -n '/### Result/{n;p;}' | sed 's/^"//; s/"$//'; }
fail() { echo "FAIL: $1"; exit 1; }
snap() { playwright-cli -s=$S snapshot > snap.out 2>&1; F=$(grep -oE '[^ ]*\.yml' snap.out | tail -1); if [ -n "$F" ] && [ -f "$F" ]; then cat "$F"; else cat snap.out; fi; }
ntabs() { playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:'; }

case "$(playwright-cli -s=$S eval "() => location.pathname" 2>&1 | res)" in /react/*) : ;;
  *) playwright-cli -s=$S eval "() => { location.href='/react/home'; return 1; }" >/dev/null 2>&1; sleep 15
     bash "$LOGIN" "$S" || exit 1; sleep 15;; esac
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/reports-management/legacy/MyReports'); dispatchEvent(new PopStateEvent('popstate')); }" >/dev/null 2>&1
sleep 40

# the P&L card showing the Meat Credit view; its Customize follows the combobox
R=$(snap | awk '/combobox "Select a view".*: Meat Credit/{on=1} on && /button "reportParams"/{print; exit}' | grep -oE 'ref=[^]]*' | cut -d= -f2)
[ -n "$R" ] || fail "no Profit and Loss card on the Meat Credit view"
playwright-cli -s=$S click "$R" >/dev/null 2>&1; sleep 10
R=$(snap | grep -E 'button "exportMenu" .*: Run' | tail -1 | grep -oE 'ref=[^]]*' | cut -d= -f2)
[ -n "$R" ] || fail "no Run in the Customize dialog"
T=$(ntabs)
playwright-cli -s=$S click "$R" >/dev/null 2>&1
for i in $(seq 1 15); do sleep 5; [ "$(ntabs)" -gt "$T" ] && break; done
[ "$(ntabs)" -gt "$T" ] || fail "report opened no tab"
playwright-cli -s=$S tab-select "$T" >/dev/null 2>&1

# first figure on the Meat Purchases row; wait for the report to render
for i in $(seq 1 12); do
  R=$(snap | awk '/cell "Meat Purchases"/{on=1;next} on && /link "/{print; exit}' | grep -oE 'ref=[^]]*' | cut -d= -f2)
  [ -n "$R" ] && break; sleep 5
done
[ -n "$R" ] || fail "no Meat Purchases row on the report"
playwright-cli -s=$S click "$R" >/dev/null 2>&1
for i in $(seq 1 12); do sleep 5; [ "$(ntabs)" -gt "$((T+1))" ] && break; done
playwright-cli -s=$S tab-select "$((T+1))" >/dev/null 2>&1
U=$(playwright-cli -s=$S eval "() => location.href" 2>&1 | res)
echo "$U" | grep -q 'GL+Account+Detail.*Account=' || fail "drill-down landed on $U"
echo "$U" > glurl.txt
echo "saved glurl.txt"

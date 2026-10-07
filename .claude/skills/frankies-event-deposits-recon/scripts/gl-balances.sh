#!/bin/bash
# Run GL Account Detail (System View) for 1242 Tripleseat Receivable and 2015 Event Deposits over a date range and parse it.
# usage: gl-balances.sh <session> <M/D/YYYY start> <M/D/YYYY end>
# writes glrows.json (every line with running balance), glbal.txt (closing balance per account per active day),
# glids.txt (ref | entity type | entry id), glbeg.txt (beginning balances)
SK=$(cd "$(dirname "$0")" && pwd)
S=$1; SN="$SK/../../bowery-ubereats/scripts/snapshot.sh"
ref() { grep -m1 "$1" "$2" | grep -oE 'ref=[^]]*' | cut -d= -f2; }
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1; bash "$SK/r365-login.sh" $S >/dev/null 2>&1 || { echo "FAIL: login"; exit 1; }
playwright-cli -s=$S eval "() => { location.href='/react/home'; return 1; }" >/dev/null 2>&1; sleep 15; bash "$SK/r365-login.sh" $S >/dev/null 2>&1 || { echo "FAIL: login"; exit 1; }; sleep 15
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/reports-management/legacy/MyReports'); dispatchEvent(new PopStateEvent('popstate')); }" >/dev/null 2>&1; sleep 35
bash $SN $S g.txt
R=$(awk '/heading "GL Account Detail"/{on=1} on && /button "View/{print; exit}' g.txt | grep -oE 'ref=[^]]*' | cut -d= -f2); playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 4
bash $SN $S g.txt; playwright-cli -s=$S click $(ref 'button "System View"' g.txt) >/dev/null 2>&1; sleep 5
bash $SN $S g.txt; R=$(awk '/heading "GL Account Detail"/{on=1} on && /button "reportParams"/{print; exit}' g.txt | grep -oE 'ref=[^]]*' | cut -d= -f2); playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 10
bash $SN $S g.txt; grep -q 'heading "GL Account Detail" \[level=2' g.txt || { echo "FAIL: parameters dialog did not open"; exit 1; }
# Account picker: a checkbox list with a search box; leave exactly 1242 and 2015 ticked
playwright-cli -s=$S click $(ref 'button "Account ▼"' g.txt) >/dev/null 2>&1; sleep 3
bash $SN $S g.txt; SB=$(ref 'textbox "Search"' g.txt)
# the list is virtualized, so clear stray ticks through Select All (tick all, then untick all)
for k in 1 2; do bash $SN $S g.txt; L=$(grep -B1 'Select All' g.txt | grep -m1 'checkbox'); echo "$L" | grep -q checked && k=done; R=$(echo "$L" | grep -oE 'ref=[^]]*' | cut -d= -f2); playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 2; [ "$k" = done ] && break; done
bash $SN $S g.txt; grep -B1 'Select All' g.txt | grep -m1 checkbox | grep -q checked && { echo "FAIL: could not clear the account picker"; exit 1; }
for a in 1242 2015; do
 playwright-cli -s=$S fill $SB "$a" >/dev/null 2>&1; sleep 2; bash $SN $S g.txt
 L=$(grep -m1 "checkbox \"$a " g.txt); echo "$L" | grep -q checked || playwright-cli -s=$S click $(echo "$L" | grep -oE 'ref=[^]]*' | cut -d= -f2) >/dev/null 2>&1; sleep 1
done
playwright-cli -s=$S fill $SB "" >/dev/null 2>&1; sleep 2; bash $SN $S g.txt
for R in $(grep 'checkbox "[0-9].*\[checked\]' g.txt | grep -v 'checkbox "\(1242\|2015\) ' | grep -oE 'ref=[^]]*' | cut -d= -f2); do playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 1; done
playwright-cli -s=$S click $(grep 'button "OK"' g.txt | tail -1 | grep -oE 'ref=[^]]*' | cut -d= -f2) >/dev/null 2>&1; sleep 2
bash $SN $S g.txt; grep -q 'combobox \[ref=[^]]*\]: 2 items selected' g.txt || { echo "FAIL: account picker is not exactly 2 items"; exit 1; }
playwright-cli -s=$S fill $(ref 'textbox "Start"' g.txt) "$2" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
bash $SN $S g.txt; playwright-cli -s=$S fill $(ref 'textbox "End"' g.txt) "$3" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 2
# Full, or entry numbers come back cut to "Events - Ab"
bash $SN $S g.txt; R=$(grep -A3 'Show Comment/Location/#' g.txt | grep -m1 'button "Full"' | grep -oE 'ref=[^]]*' | cut -d= -f2); [ -n "$R" ] || { echo "FAIL: no Full option"; exit 1; }; playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 1
N=$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')
playwright-cli -s=$S eval "$(cat "$SK/run.js")" >/dev/null 2>&1
for i in $(seq 1 24); do sleep 5; [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt "$N" ] && break; done
playwright-cli -s=$S tab-select $N >/dev/null 2>&1
for i in $(seq 1 24); do sleep 5; bash $SN $S glsnap.txt; grep -q 'Grand Total' glsnap.txt && break; done
grep -q 'Grand Total' glsnap.txt || { echo "FAIL: report did not render"; exit 1; }
grep -oE '(cell|link) "[^"]*"' glsnap.txt | sed 's/^cell "//;s/"$//' > glcells.txt; node "$SK/parse.js" glcells.txt > glrows.json
grep -A1 -E 'link "[^"]*" \[ref' glsnap.txt | paste - - - 2>/dev/null | sed -nE 's/.*link "([^"]+)".*entityType=([^&]+)&entityId=([0-9a-f-]+).*/\1|\2|\3/p' | sed 's/%20/ /g' | sort -u > glids.txt
awk '/^[0-9]{4} - /{a=$1} /^Beg Balance:/{getline; print a, $0}' glcells.txt > glbeg.txt
node -e 'const r=require("./glrows.json");const b={};for(const x of r){b[x.acct.slice(0,4)+" "+x.date]=x.bal};console.log(Object.entries(b).map(e=>e.join(" ")).join("\n"))' > glbal.txt
playwright-cli -s=$S tab-close $N >/dev/null 2>&1; playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
echo "rows $(node -e 'console.log(require("./glrows.json").length)')"; cat glbeg.txt

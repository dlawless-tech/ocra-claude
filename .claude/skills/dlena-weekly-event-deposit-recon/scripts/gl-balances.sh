# Run the GL Account Detail "Event Deposits" view for a date range and parse it.
# usage: gl-balances.sh <session> <M/D/YYYY start> <M/D/YYYY end>
# writes glrows.json (every line), glbal.txt (closing balance per account per day), glids.txt (ref number -> entry id)
SK=$(cd "$(dirname "$0")" && pwd)
S=$1; SN="$SK/../../bowery-ubereats/scripts/snapshot.sh"
res() { grep '^"' | head -1 | sed 's/^"//;s/"$//'; }
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1; bash "$SK/r365-login.sh" $S >/dev/null 2>&1 || { echo "FAIL: login"; exit 1; }
playwright-cli -s=$S eval "() => { location.href='/react/home'; return 1; }" >/dev/null 2>&1; sleep 15; bash "$SK/r365-login.sh" $S >/dev/null 2>&1 || { echo "FAIL: login"; exit 1; }; sleep 20
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/reports-management/legacy/MyReports'); dispatchEvent(new PopStateEvent('popstate')); }" >/dev/null 2>&1; sleep 35
bash $SN $S g.txt
R=$(awk '/heading "GL Account Detail"/{on=1} on && /button "View/{print; exit}' g.txt | grep -oE 'ref=[^]]*' | cut -d= -f2); playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 3
bash $SN $S g.txt; R=$(grep -m1 'button "Event Deposits"' g.txt | grep -oE 'ref=[^]]*' | cut -d= -f2); playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 4
bash $SN $S g.txt; R=$(awk '/combobox "Select a view".*: Event Deposits/{on=1} on && /button "reportParams"/{print; exit}' g.txt | grep -oE 'ref=[^]]*' | cut -d= -f2); playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 10
bash $SN $S g.txt; R=$(grep 'textbox "Start"' g.txt | grep -oE 'ref=[^]]*' | cut -d= -f2); playwright-cli -s=$S fill $R "$2" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
bash $SN $S g.txt; R=$(grep 'textbox "End"' g.txt | grep -oE 'ref=[^]]*' | cut -d= -f2); playwright-cli -s=$S fill $R "$3" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 2
V=$(playwright-cli -s=$S eval "$(cat "$SK/dlg.js")" 2>&1 | res | grep -oE "[0-9]+/[0-9]+/[0-9]{4}" | tr '\n' ' '); echo "dates: $V"
N=$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')
playwright-cli -s=$S eval "$(cat "$SK/run.js")" >/dev/null 2>&1
for i in $(seq 1 20); do sleep 5; [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt "$N" ] && break; done
playwright-cli -s=$S tab-select $N >/dev/null 2>&1
for i in $(seq 1 12); do sleep 5; bash $SN $S glsnap.txt; grep -q 'Total Banquet Deposits' glsnap.txt && break; done
grep -oE '(cell|link) "[^"]*"' glsnap.txt | sed 's/^cell "//;s/"$//' > glcells.txt; node "$SK/parse.js" glcells.txt > glrows.json
bash "$SK/ids.sh" glsnap.txt > glids.txt
node -e 'const r=require("./glrows.json");const b={};for(const x of r){b[x.acct.slice(0,4)+" "+x.date]=x.bal};console.log(Object.entries(b).map(e=>e.join(" ")).join("\n"))' > glbal.txt
playwright-cli -s=$S tab-close $N >/dev/null 2>&1; playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
echo "rows $(node -e 'console.log(require("./glrows.json").length)')"

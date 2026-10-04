#!/bin/bash
# GL Account Detail for 1210 Inventory-Food at 370 Select Industries over one window.
# usage: gl-balance.sh <session> <M/D/YYYY start> <M/D/YYYY end>
# prints the dialog read-back, then BEG / one line per entry / END; writes glcells.txt
set -u
SK=/c/Users/trici/ocra-claude/.claude/skills/select-period-end-inventory/scripts; S=$1; A=$2; B=$3; AC=$4; AN="$5"
SN="$SK/../../bowery-ubereats/scripts/snapshot.sh"; DLG="$SK/../../dlena-weekly-event-deposit-recon/scripts/dlg.js"; RUN="$SK/../../dlena-weekly-event-deposit-recon/scripts/run.js"
LOGIN="$SK/../../norms-grubhub/scripts/r365-login.sh"
res() { sed -n '/### Result/{n;p;}'; }
ref() { grep -m1 "$1" g.txt | grep -oE 'ref=[^]]*' | cut -d= -f2; }
fail() { echo "FAIL: $1"; exit 1; }
ntabs() { playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:'; }

playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
bash "$LOGIN" $S >/dev/null 2>&1 || fail login
playwright-cli -s=$S eval "() => { location.href='/react/home'; return 1; }" >/dev/null 2>&1; sleep 15
bash "$LOGIN" $S >/dev/null 2>&1 || fail login; sleep 5
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/reports-management/legacy/MyReports'); dispatchEvent(new PopStateEvent('popstate')); }" >/dev/null 2>&1; sleep 40

# GL Account Detail card on System View; its Customize follows the heading
bash $SN $S g.txt
R=$(awk '/heading "GL Account Detail"/{on=1} on && /button "reportParams"/{print; exit}' g.txt | grep -oE 'ref=[^]]*' | cut -d= -f2)
[ -n "$R" ] || fail "no GL Account Detail card"
playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 10
echo "pick: $(playwright-cli -s=$S eval "$(sed "s/__ACCT__/$AC/g" gl-pick.tpl.js)" 2>&1 | res)"; sleep 2

# location filter is multi-select: real click, type, real click the option
bash $SN $S g.txt; R=$(ref 'button "Filter Filter'); [ -n "$R" ] || fail "no Filter control"
playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 3
playwright-cli -s=$S type "370" >/dev/null 2>&1; sleep 3
bash $SN $S g.txt; R=$(ref 'button "370 - Select Industries"'); [ -n "$R" ] || fail "no 370 option"
playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 2

bash $SN $S g.txt; R=$(ref 'textbox "Start"'); playwright-cli -s=$S fill $R "$A" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
bash $SN $S g.txt; R=$(ref 'textbox "End"'); playwright-cli -s=$S fill $R "$B" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 2

V=$(playwright-cli -s=$S eval "$(cat $DLG)" 2>&1 | res)
CHK=$(node -e 'const j=JSON.parse(JSON.parse(process.argv[1]));const v=j.ins.map(x=>x.v);console.log(v.slice(0,5).join(" | "))' "$V")
echo "dialog: $CHK"
[ "$CHK" = "$AN | Location | 370 - Select Industries | $A | $B" ] || fail "parameters did not take"

T=$(ntabs)
playwright-cli -s=$S eval "$(cat $RUN)" >/dev/null 2>&1
for i in $(seq 1 20); do sleep 5; [ "$(ntabs)" -gt "$T" ] && break; done
[ "$(ntabs)" -gt "$T" ] || fail "report opened no tab"
playwright-cli -s=$S tab-select $T >/dev/null 2>&1
for i in $(seq 1 12); do sleep 5; bash $SN $S g.txt; grep -q 'Grand Total' g.txt && break; done
grep -q 'Grand Total' g.txt || fail "report never rendered"
grep -oE '(cell|link) "[^"]*"' g.txt | sed 's/^cell "//;s/^link "//;s/"$//' | sed -n '/^Balance$/,/^Grand Total$/p' > glcells.txt
playwright-cli -s=$S tab-close $T >/dev/null 2>&1; playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
cp glcells.txt gl-$AC.txt; node parse-gl.js glcells.txt

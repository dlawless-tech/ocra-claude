#!/bin/bash
# Run GL Account Detail for 1239 - AR - DoorDash, all locations, Show Unapproved Yes, and save it as CSV.
# usage: gl-detail.sh <session> <start M/D/YYYY> <end M/D/YYYY> <out.csv>
set -u
S="$1"; START="$2"; END="$3"; OUT="$4"
D=../../.claude/skills/flecha-doordash/scripts; SNAP="$D/../../bowery-ubereats/scripts/snapshot.sh"; HOST=https://flecha.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
ev() { playwright-cli -s=$S eval "$(cat "$1")" 2>&1 | res; }
while playwright-cli -s=$S tab-list 2>&1 | grep -qE '^- 1:'; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done

playwright-cli -s=$S goto "$HOST/react/home" >/dev/null 2>&1; sleep 15
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/reports-management/legacy/MyReports'); window.dispatchEvent(new PopStateEvent('popstate')); return 1; }" >/dev/null 2>&1
R=""; for i in 1 2 3 4 5 6; do sleep 15; bash "$SNAP" $S gl.snap.txt
  R=$(grep -oE 'option "Accounting" .ref=f?[0-9]*e[0-9]+' gl.snap.txt | grep -oE 'f?[0-9]*e[0-9]+$'); [ -n "$R" ] && break; done
[ -n "$R" ] || { echo "FAIL: no Accounting tab on My Reports"; exit 1; }
playwright-cli -s=$S click $R >/dev/null 2>&1
# the card's own Customize is the first one after its heading
C=""; for i in 1 2 3 4; do sleep 12; bash "$SNAP" $S gl.snap.txt
  C=$(awk '/heading "GL Account Detail" \[level=3\]/{f=1} f&&/Customize/{print; exit}' gl.snap.txt | grep -oE 'ref=f?[0-9]*e[0-9]+' | cut -d= -f2); [ -n "$C" ] && break; done
[ -n "$C" ] || { echo "FAIL: no GL Account Detail card"; exit 1; }
playwright-cli -s=$S click $C >/dev/null 2>&1; sleep 10
bash "$SNAP" $S gl.snap.txt
Y=$(awk '/button "Show Unapproved No Yes"/{f=1} f&&/button "Yes"/{print; exit}' gl.snap.txt | grep -oE 'ref=f?[0-9]*e[0-9]+' | cut -d= -f2)
TS=$(grep -oE 'textbox "Start" .ref=f?[0-9]*e[0-9]+' gl.snap.txt | grep -oE 'f?[0-9]*e[0-9]+$' | tail -1)
TE=$(grep -oE 'textbox "End" .ref=f?[0-9]*e[0-9]+' gl.snap.txt | grep -oE 'f?[0-9]*e[0-9]+$' | tail -1)
[ -n "$Y" ] && [ -n "$TS" ] && [ -n "$TE" ] || { echo "FAIL: dialog refs Yes=$Y Start=$TS End=$TE"; exit 1; }

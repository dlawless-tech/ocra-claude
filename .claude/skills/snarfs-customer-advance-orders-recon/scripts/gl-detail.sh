#!/bin/bash
# Run GL Account Detail for $ACCT, all locations, subtotal by location, and save it as CSV.
# usage: gl-detail.sh <session> <start M/D/YYYY> <end M/D/YYYY> <out.csv>
# Show Unapproved is Yes; UNAPPROVED=no runs approved entries only, as the balance sheet does.
# KEEP=1 leaves the report tab open, so its NJ links (entityId) can be read.
set -u
S="$1"; START="$2"; END="$3"; OUT="$4"
ACCT=${ACCT:?set ACCT to the full account display, e.g. "NNNNN - Customer Advance Orders"}
D=$(dirname "$0"); SNAP="$D/snapshot.sh"; HOST=https://snarfsstl.restaurant365.com
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
playwright-cli -s=$S fill $TS "$START" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
playwright-cli -s=$S fill $TE "$END" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
sed "s/__ACCT__/${ACCT%% *}/g" "$D/gl-params.js" > gl-params.run.js; P=$(ev gl-params.run.js)
# the scope handler leaves Show Unapproved unset; only a real click takes
WANT=true; [ "${UNAPPROVED:-yes}" = no ] && WANT=false
echo "$P" | grep -q "unapproved\\\\\":$WANT" || { playwright-cli -s=$S click $Y >/dev/null 2>&1; sleep 1; P=$(ev gl-params.run.js); }
echo "$P"
echo "$P" | grep -qF "$ACCT" && echo "$P" | grep -q "unapproved\\\\\":$WANT" || { echo "FAIL: parameters did not take"; exit 1; }
ev "$D/gl-run.js" | grep -q ran || { echo "FAIL: run"; exit 1; }
sleep 30; playwright-cli -s=$S tab-select 1 >/dev/null 2>&1
for i in $(seq 1 12); do sleep 10
  playwright-cli -s=$S eval "$(cat "$D/gl-csv.js")" > gl.raw.txt 2>&1
  node -e 'const t=require("fs").readFileSync(process.argv[1],"utf8");const m=t.match(/### Result\n([\s\S]*?)\n### Ran/);if(!m)process.exit(1);const s=JSON.parse(m[1]);if(!/^textbox1/.test(s))process.exit(1);require("fs").writeFileSync(process.argv[2],s)' gl.raw.txt "$OUT" && break
done
[ -s "$OUT" ] || { echo "FAIL: no CSV"; exit 1; }
sed -n 2p "$OUT" | grep -q "$ACCT,$START - $END" || { echo "FAIL: report header reads $(sed -n 2p "$OUT")"; exit 1; }
[ -n "${KEEP:-}" ] || playwright-cli -s=$S tab-close 1 >/dev/null 2>&1
echo "saved $OUT"

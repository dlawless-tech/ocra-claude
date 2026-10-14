#!/bin/bash
# Run dLena's saved "AP Aging" view on My Reports and export it to Excel from the viewer's save icon.
# Usage: run-aging.sh <session> <out dir>   -> <out dir>/dLena AP Aging.xlsx
# Run from the session's own directory.
set -u
S=$1; OUT=$2
P="playwright-cli -s=$S"
res() { sed -n '/### Result/{n;p;q}' | sed 's/^"//; s/"$//'; }
fail() { echo "FAIL: $1"; exit 1; }
snap() { $P snapshot --filename=.ag.yml >/dev/null 2>&1; }
ntabs() { $P tab-list 2>&1 | grep -cE '^- [0-9]+:'; }

[ "$($P eval '() => location.hostname' 2>&1 | res)" = unoatfifth.restaurant365.com ] || fail "logged out, run login.sh $S"
$P tab-select 0 >/dev/null 2>&1; $P press Escape >/dev/null 2>&1
$P eval "() => { history.pushState({}, '', '/react/reports-management/legacy/MyReports'); dispatchEvent(new PopStateEvent('popstate')); }" >/dev/null 2>&1

# first AP Aging card, set to the saved "AP Aging" view
card() { awk '/heading "AP Aging" \[level=3\]/{on=1} on' .ag.yml | head -15; }
for i in $(seq 1 12); do snap; card | grep -q 'combobox "Select a view"' && break; sleep 5; done
card | grep -q 'combobox "Select a view"' || fail "no AP Aging card on My Reports"
if ! card | grep -q 'combobox "Select a view".*: AP Aging$'; then
  $P click "$(card | grep -oP 'combobox "Select a view" (\[active\] )?\[ref=\K[^\]]+')" >/dev/null 2>&1; sleep 3; snap
  R=$(card | grep -oP 'button "AP Aging" \[ref=\K[^\]]+' | head -1)
  [ -n "$R" ] || fail "no saved AP Aging view"
  $P click "$R" >/dev/null 2>&1; sleep 3; snap
  card | grep -q 'combobox "Select a view".*: AP Aging$' || fail "view did not switch to AP Aging"
fi

# Customize, then the dialog's own Run
$P click "$(card | grep -oP 'button "reportParams" \[ref=\K[^\]]+')" >/dev/null 2>&1; sleep 8; snap
R=$(grep -E 'button "exportMenu" .*: Run' .ag.yml | tail -1 | grep -oE 'ref=[^]]*' | cut -d= -f2)
[ -n "$R" ] || fail "no Run in the Customize dialog"
T=$(ntabs)
$P click "$R" >/dev/null 2>&1
for i in $(seq 1 15); do sleep 4; [ "$(ntabs)" -gt "$T" ] && break; done
[ "$(ntabs)" -gt "$T" ] || fail "report opened no tab"
$P tab-select "$T" >/dev/null 2>&1

# save icon > Excel, once the report has rendered
TXT='() => { const fr=[]; const w=x=>{try{fr.push(x);for(let i=0;i<x.frames.length;i++)w(x.frames[i])}catch(e){}}; w(window); return fr.map(f=>{try{return f.document.body.innerText}catch(e){return ""}}).join(" ").replace(/\s+/g," ") }'
for i in $(seq 1 20); do
  ASOF=$($P eval "$TXT" 2>&1 | res | grep -oP 'As of \K[0-9/]+' | head -1)
  [ -n "$ASOF" ] && break; sleep 5
done
[ -n "$ASOF" ] || fail "report did not render"
snap
R=$(awk '/table "Export drop down menu"/{on=1} on && /link /{print; exit}' .ag.yml | grep -oE 'ref=[^]]*' | cut -d= -f2)
$P click "$R" >/dev/null 2>&1; sleep 2; snap
R=$(grep -oP 'link "Excel" \[ref=\K[^\]]+' .ag.yml | head -1)
[ -n "$R" ] || fail "no Excel under the save icon"
F=$($P click "$R" 2>&1 | grep -oP 'Downloaded file .* to "\K[^"]+')
for i in $(seq 1 10); do [ -n "$F" ] && [ -s "$F" ] && break; sleep 3; done
[ -n "$F" ] && [ -s "$F" ] || fail "no Excel download"
cp "$F" "$OUT/dLena AP Aging.xlsx" && rm -f "$F"
$P tab-close "$T" >/dev/null 2>&1; $P tab-select 0 >/dev/null 2>&1; rm -f .ag.yml
echo "as of $ASOF"
echo "saved $OUT/dLena AP Aging.xlsx ($(stat -c %s "$OUT/dLena AP Aging.xlsx") bytes)"

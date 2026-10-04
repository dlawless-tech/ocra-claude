#!/usr/bin/env bash
# Usage: pull-report.sh <session> aging <legal entity> <as of M/D/YYYY> <out.csv>
#        pull-report.sh <session> gl <account no> <start> <end> <out.csv>
# Runs from the session's own directory, on an authenticated React page.
set -u
S=$1; KIND=$2; Q=$3; E="$(cd "$(dirname "$0")" && pwd)/eval"
P="playwright-cli -s=$S"
res() { sed -n '/### Result/{n;p;q}'; }
if [ "$KIND" = aging ]; then CARD="AP Aging"; ASOF=$4; OUT=$5
  T='[["Detail Level","Detail"],["Show Unapproved","Yes"],["Hide $0 Balances","Yes"]]'
else CARD="GL Account Detail"; START=$4; END=$5; OUT=$6
  T='[["Show Unapproved","Yes"],["Sum by Transaction","No"],["Show Comment/Location/#","Full"]]'
fi
[ "$($P eval '() => location.hostname' 2>&1 | res)" = '"bowerygroup.restaurant365.com"' ] || { echo "FAIL: logged out, run r365-login.sh $S"; exit 1; }
$P tab-select 0 >/dev/null 2>&1
# an open Customize dialog hides the cards from the snapshot
$P press Escape >/dev/null 2>&1
$P eval "() => { history.pushState({}, '', '/react/reports-management/legacy/MyReports'); window.dispatchEvent(new PopStateEvent('popstate')); }" >/dev/null 2>&1
REF=""
for i in $(seq 1 12); do
  $P snapshot --filename=.pr.yml >/dev/null 2>&1
  n=$(grep -n "heading \"$CARD\" \[level=3\]" .pr.yml | head -1 | cut -d: -f1)
  [ -n "$n" ] && REF=$(sed -n "${n},$((n+20))p" .pr.yml | grep -oP '\[ref=\K[^\]]+(?=\] \[cursor=pointer\]: Customize)' | head -1)
  [ -n "$REF" ] && break; sleep 6
done
[ -n "$REF" ] || { echo "FAIL: no $CARD card"; exit 1; }
$P click "$REF" >/dev/null 2>&1; sleep 4
r=$($P eval "$(sed "s|__Q__|$Q|g; s|__T__|$T|" "$E/set-params.js")" 2>&1 | res); [ "$r" = '"ok"' ] || { echo "$r"; exit 1; }
$P snapshot --filename=.pr.yml >/dev/null 2>&1
fill() { ref=$(grep -oP "textbox \"$1\" \[ref=\K[^\]]+" .pr.yml | head -1); $P fill "$ref" "$2" >/dev/null 2>&1; }
if [ "$KIND" = aging ]; then fill AsOf "$ASOF"; else fill Start "$START"; fill End "$END"; fi
$P press Tab >/dev/null 2>&1
echo "params: $($P eval "$(cat "$E/check-params.js")" 2>&1 | res)"
$P eval "$(cat "$E/run-report.js")" >/dev/null 2>&1; sleep 12
TAB=$($P tab-list 2>&1 | grep -oP '^- \K\d+' | tail -1)
$P tab-select "$TAB" >/dev/null 2>&1
for i in $(seq 1 30); do
  $P eval "$(cat "$E/export-csv.js")" > .pr.out 2>&1
  grep -q '"not ready"' .pr.out || break; sleep 10
done
node -e 'const s=require("fs").readFileSync(".pr.out","utf8");const m=s.match(/### Result\n("[\s\S]*?")\n### Ran/);if(!m){console.error("FAIL: no export\n"+s.slice(0,800));process.exit(1)}require("fs").writeFileSync(process.argv[1],JSON.parse(m[1]));console.log("saved "+process.argv[1])' "$OUT" || exit 1
$P tab-close "$TAB" >/dev/null 2>&1; $P tab-select 0 >/dev/null 2>&1
rm -f .pr.yml .pr.out

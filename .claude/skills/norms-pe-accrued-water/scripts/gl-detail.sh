#!/bin/bash
# GL Account Detail for one account, subtotaled by location, unapproved included.
# Usage: gl-detail.sh <session> <acct> <start M/D/YYYY> <end M/D/YYYY> <out>
#   <out>       report cells, one per line
#   <out>.snap  raw snapshot; its links carry each transaction's entityId
# Run from a scratch folder: it writes g.txt and _pick.js there.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; SK="$HERE/../.."
S=$1; AC=$2; A=$3; B=$4; OUT=$5
SN="$SK/bowery-ubereats/scripts/snapshot.sh"; DLG="$SK/dlena-weekly-event-deposit-recon/scripts/dlg.js"; RUN="$SK/dlena-weekly-event-deposit-recon/scripts/run.js"
LOGIN="$SK/norms-grubhub/scripts/r365-login.sh"
res() { sed -n '/### Result/{n;p;}'; }
ref() { grep -m1 "$1" g.txt | grep -oE 'ref=[^]]*' | cut -d= -f2; }
fail() { echo "FAIL: $1"; exit 1; }
ntabs() { playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:'; }
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
bash "$LOGIN" $S >/dev/null 2>&1 || fail login
playwright-cli -s=$S eval "() => { location.href='/react/home'; return 1; }" >/dev/null 2>&1; sleep 15
bash "$LOGIN" $S >/dev/null 2>&1 || fail login; sleep 5
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/reports-management/legacy/MyReports'); dispatchEvent(new PopStateEvent('popstate')); }" >/dev/null 2>&1; sleep 40
bash $SN $S g.txt
R=$(awk '/heading "GL Account Detail"/{on=1} on && /button "reportParams"/{print; exit}' g.txt | grep -oE 'ref=[^]]*' | cut -d= -f2)
[ -n "$R" ] || fail "no GL Account Detail card"
playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 10
sed "s/__A__/$AC/" "$HERE/pick.js" > _pick.js
echo "pick: $(playwright-cli -s=$S eval "$(cat _pick.js)" 2>&1 | res)"; sleep 2
echo "subtotal: $(playwright-cli -s=$S eval "$(cat "$HERE/subloc.js")" 2>&1 | res)"; sleep 2
bash $SN $S g.txt; R=$(ref 'textbox "Start"'); playwright-cli -s=$S fill $R "$A" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
bash $SN $S g.txt; R=$(ref 'textbox "End"'); playwright-cli -s=$S fill $R "$B" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 2
V=$(playwright-cli -s=$S eval "$(cat $DLG)" 2>&1 | res)
echo "dialog: $(node -e 'const j=JSON.parse(JSON.parse(process.argv[1]));console.log(j.ins.map(x=>x.v).join(" | "));console.log(j.groups.join(" ; "))' "$V")"
T=$(ntabs)
playwright-cli -s=$S eval "$(cat $RUN)" >/dev/null 2>&1
for i in $(seq 1 20); do sleep 5; [ "$(ntabs)" -gt "$T" ] && break; done
[ "$(ntabs)" -gt "$T" ] || fail "report opened no tab"
playwright-cli -s=$S tab-select $T >/dev/null 2>&1
for i in $(seq 1 24); do sleep 5; bash $SN $S g.txt; grep -q 'Grand Total' g.txt && break; done
grep -q 'Grand Total' g.txt || fail "report never rendered"
cp g.txt "$OUT.snap"
grep -oE '(cell|link) "[^"]*"' g.txt | sed 's/^cell "//;s/^link "//;s/"$//' > "$OUT"
playwright-cli -s=$S tab-close $T >/dev/null 2>&1; playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
wc -l "$OUT"

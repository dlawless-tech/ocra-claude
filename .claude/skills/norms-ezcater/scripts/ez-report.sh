#!/bin/bash
# Create and download the EZ Cater Completed Orders report for every NORMS store, then convert it to csv.
# usage: ez-report.sh <session> <start M/D/YYYY> <end M/D/YYYY> <out.csv>
set -u
S=$1; ST=$2; EN=$3; OUT=$4
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "FAIL: $*"; exit 1; }
js() { IFS=/ read -r m d y <<< "$1"; echo "new Date($y, $((10#$m - 1)), $((10#$d)))"; }
NAME="NORMS EZ Cater ${ST%/*}-${EN%/*}"; NAME="${NAME//\//.}.${EN##*/20}"
playwright-cli -s=$S goto https://www.ezcater.com/ez_manage/reports/new >/dev/null 2>&1; sleep 8
R=$(playwright-cli -s=$S eval "$(cat "$HERE/report-stores.js")" 2>&1 | res)
echo "$R" | grep -qE '(^|[^0-9])[1-9][0-9]* selected' || die "stores: $R"
R=$(playwright-cli -s=$S eval "() => { const a=jQuery('#ez_manage_report_start_date'), b=jQuery('#ez_manage_report_end_date'); a.datepicker('setDate', $(js $ST)); a.trigger('change'); b.datepicker('setDate', $(js $EN)); b.trigger('change'); document.querySelector('#ez_manage_report_name').value='$NAME'; return a.val()+'|'+b.val(); }" 2>&1 | res | tr -d '"')
IFS=/ read -r m d y <<< "$ST"; W1=$(printf '%s-%02d-%02d' $y $((10#$m)) $((10#$d))); IFS=/ read -r m d y <<< "$EN"; W2=$(printf '%s-%02d-%02d' $y $((10#$m)) $((10#$d)))
[ "$R" = "$W1|$W2" ] || die "dates $R want $W1|$W2"
playwright-cli -s=$S click 'input[name=commit]' >/dev/null 2>&1; sleep 12
# newest report row with this name; its first link is the S3 download
URL=$(playwright-cli -s=$S eval "() => { const r=Array.from(document.querySelectorAll('tr')).find(t=>t.cells[0]&&t.cells[0].innerText.trim()==='$NAME'); const a=r&&r.querySelector('a[href*=\"amazonaws\"]'); return a?a.href:''; }" 2>&1 | res | tr -d '"')
[ -n "$URL" ] || die "no report row $NAME"
mkdir -p ez; rm -f .playwright-cli/norms-ez-cater-*.xlsx
playwright-cli -s=$S eval "() => { const r=Array.from(document.querySelectorAll('tr')).find(t=>t.cells[0]&&t.cells[0].innerText.trim()==='$NAME'); r.querySelector('a[href*=\"amazonaws\"]').click(); }" >/dev/null 2>&1; sleep 8
F=$(ls -t .playwright-cli/norms-ez-cater-*.xlsx 2>/dev/null | head -1)
[ -n "$F" ] || die "no download"
mv "$F" ez/ && node "$HERE/../../bowery-payroll/scripts/xlsx-to-csv.js" "ez/$(basename "$F")" > "$OUT" || die "convert"
echo "report $NAME $(($(grep -c . "$OUT") - 2)) orders -> $OUT"

#!/bin/bash
# GL Account Detail for one Flecha account, all entities, Show Unapproved Yes. Prints one pipe-joined row per report line.
# usage: gl.sh <session> <account 1235|1237|1238|7161> <M/D/YYYY start> <M/D/YYYY end> > gl<account>.txt
# BYLOC=1 subtotals by location, which adds each store's name and Beg Balance row.
# The URL carries this login's R365 user id.
set -u
S=$1; A=$2; START=$3; END=$4
case $A in
  1235) ACC=293B5F76-0674-4B91-B016-B99CD4577E44;; 1237) ACC=2096B46A-794B-4509-8A08-493B809DC81A;;
  1238) ACC=C1184338-29D9-4158-BE50-1F9D01FA6A0F;; 7161) ACC=CF491BD4-2CE6-EE11-B68D-6045BD313EA9;;
  *) echo "FAIL: unknown account $A" >&2; exit 1;; esac
SUB=${BYLOC:-0}
U="https://flecha.restaurant365.com/ReportServer/Pages/ReportViewer.aspx?/NA01/GL+Account+Detail&rs:Command=Render&rs:ParameterLanguage=en-US&rc:LinkTarget=_blank&Database=flecha&User=fc1d6774-dc17-49e3-9e16-163d30097de9&SQLServer=pro-sqlag-621.restaurant365.com&TimeZoneCode=PDT&UtcOffset=-07&SumByTrxYes=1&ExcludeAccountsWithoutActivity=False&SubtotalBy=$SUB&ShowUnapproved=1&Account=$ACC&FilterBy=Legal%20Entity&Filter=810FC99D-0A98-442D-83FA-31515F0C07A9&Filter=A61A8DF4-0B7F-4D65-8374-FC856DC4B831&Filter=553D7DD0-D6B1-432C-A3BC-C8A6C0174993&Filter=6EC82C32-4070-4908-8953-CE4D90A37660&Filter=D54E77EC-6E5C-48BD-A9C6-48CBDCBFEEA7&Start=$START&End=$END&Calendar=1"
playwright-cli -s=$S tab-new >/dev/null 2>&1
T=$(( $(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:') - 1 ))
playwright-cli -s=$S tab-select $T >/dev/null 2>&1
playwright-cli -s=$S goto "$U" >/dev/null 2>&1
JS="() => { const rows=[...document.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>td.innerText.trim()).filter(Boolean)).filter(r=>r.length); if(!rows.some(r=>r.includes('Grand Total'))) return 'wait'; const seen=new Set(); return rows.map(r=>r.join('|')).filter(k=>/^(\d+\/\d+\/\d{4}\||Total |Grand Total|[0-9]{4} - |Flecha [A-Za-z0-9 ]+$|Corporate$)/.test(k) && !seen.has(k) && seen.add(k)).join('\n'); }"
OUT=$(mktemp); trap 'rm -f "$OUT"' EXIT
for i in $(seq 1 24); do sleep 5; playwright-cli -s=$S eval "$JS" 2>&1 | sed -n '/### Result/{n;p;}' > "$OUT"; [ -s "$OUT" ] && ! grep -qx '"wait"' "$OUT" && break; done
playwright-cli -s=$S tab-close $T >/dev/null 2>&1; playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
{ [ -s "$OUT" ] && ! grep -qx '"wait"' "$OUT"; } || { echo "FAIL: report never rendered" >&2; exit 1; }
# a long range overflows the argument list, so the result goes through a file
node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")))' "$OUT"

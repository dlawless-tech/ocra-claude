#!/bin/bash
# GL Account Detail for 1242 - AR - GrubHub, all Flecha entities, Show Unapproved Yes.
# usage: gl-1242.sh <session> <M/D/YYYY start> <M/D/YYYY end> > gl.txt
# Prints one pipe-joined row per report line. The URL carries this login's R365 user id.
set -u
S=$1; A=$2; B=$3
U="https://flecha.restaurant365.com/ReportServer/Pages/ReportViewer.aspx?/NA01/GL+Account+Detail&rs:Command=Render&rs:ParameterLanguage=en-US&rc:LinkTarget=_blank&Database=flecha&User=fc1d6774-dc17-49e3-9e16-163d30097de9&SQLServer=pro-sqlag-621.restaurant365.com&TimeZoneCode=PDT&UtcOffset=-07&SumByTrxYes=1&ExcludeAccountsWithoutActivity=False&SubtotalBy=0&ShowUnapproved=1&Account=05DF50FB-4CE1-41B1-BCD5-3C9811B9AF95&FilterBy=Legal%20Entity&Filter=810FC99D-0A98-442D-83FA-31515F0C07A9&Filter=A61A8DF4-0B7F-4D65-8374-FC856DC4B831&Filter=553D7DD0-D6B1-432C-A3BC-C8A6C0174993&Filter=6EC82C32-4070-4908-8953-CE4D90A37660&Filter=D54E77EC-6E5C-48BD-A9C6-48CBDCBFEEA7&Start=$A&End=$B&Calendar=1"
playwright-cli -s=$S tab-new >/dev/null 2>&1
T=$(( $(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:') - 1 ))
playwright-cli -s=$S tab-select $T >/dev/null 2>&1
playwright-cli -s=$S goto "$U" >/dev/null 2>&1
JS="() => { const rows=[...document.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>td.innerText.trim()).filter(Boolean)).filter(r=>r.length); if(!rows.some(r=>r.includes('Grand Total'))) return 'wait'; const seen=new Set(); return rows.map(r=>r.join('|')).filter(k=>/^(\d+\/\d+\/\d{4}\||Total |Grand Total|1242 )/.test(k) && !seen.has(k) && seen.add(k)).join('\n'); }"
R=wait
for i in $(seq 1 20); do sleep 5; R=$(playwright-cli -s=$S eval "$JS" 2>&1 | sed -n '/### Result/{n;p;}'); [ "$R" != '"wait"' ] && [ -n "$R" ] && break; done
playwright-cli -s=$S tab-close $T >/dev/null 2>&1; playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
case "$R" in '"wait"'|'') echo "FAIL: report never rendered" >&2; exit 1;; esac
node -e 'console.log(JSON.parse(process.argv[1]))' "$R"

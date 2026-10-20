#!/bin/bash
# Total Sales for one Monday-Sunday week from the GL Account Detail on every revenue account, unapproved included.
# usage: sales.sh <session> <monday M/D/YYYY> <sunday M/D/YYYY> <outdir>
# Prints {"start","end","credits","debits","netSales","accrual","foodDays"}. Exit 1 when the report does not render.
S="$1"; START="$2"; END="$3"; OUT="$4"
# AccountType = the Revenue GL type, the same drill-down the Week vs Prior P&L's Total Sales link opens
URL="https://cucinacolore.restaurant365.com/ReportServer/Pages/ReportViewer.aspx?/NA03/GL+Account+Detail&rs:Command=Render&rs:ParameterLanguage=en-US&rc:LinkTarget=_blank&Database=cucinacolore&User=3ad5875a-ad3d-4c32-89f7-8a59d451302a&SQLServer=pro-sqlag-582.restaurant365.com&TimeZoneCode=MDT&UtcOffset=-06&SumByTrxYes=1&ExcludeAccountsWithoutActivity=False&SubtotalBy=0&ShowUnapproved=1&FilterBy=Show%20All&Filter=00000000-0000-0000-0000-000000000000&Start=$START&End=$END&Calendar=0&AccountType=GLType:E8EAADC6-95F2-E811-93F9-0CC47A1F6E62&CustomField=0&CustomFieldOptions=-1"
SNAP="$OUT/sales.txt"

playwright-cli -s=$S tab-new "$URL" >/dev/null 2>&1
for i in $(seq 1 12); do sleep 5
  playwright-cli -s=$S snapshot > "$SNAP" 2>&1
  F=$(grep -oE '[.]playwright-cli[\\/][A-Za-z0-9._-]+[.]yml' "$SNAP" | head -1 | sed 's|\\\\|/|g')
  [ -n "$F" ] && [ -f "$F" ] && cat "$F" > "$SNAP"
  grep -q 'cell "Grand Total"' "$SNAP" && break; done
playwright-cli -s=$S tab-close >/dev/null 2>&1
grep -q 'cell "Grand Total"' "$SNAP" || { echo "FAIL no report"; exit 1; }

grep -oE 'cell "[^"]*"' "$SNAP" | sed 's/^cell "//;s/"$//' > "$OUT/sales.cells"
node -e '
const fs=require("fs"); const [f,start,end]=process.argv.slice(1);
const c=fs.readFileSync(f,"utf8").split(/\r?\n/);
const n=s=>+String(s).replace(/,/g,"");
const g=c.indexOf("Grand Total"); const debits=n(c[g+1]), credits=n(c[g+2]);
const net=Math.round((credits-debits)*100)/100;
const a=c.indexOf("42000 - Food Sales"), b=c.indexOf("Total Food Sales");
const days=new Set(c.slice(a,b).filter(x=>/^\d+\/\d+\/\d{4}$/.test(x))).size;
console.log(JSON.stringify({start,end,credits,debits,netSales:net,accrual:Math.round(net*1.5)/100,foodDays:days}));
' "$OUT/sales.cells" "$START" "$END"

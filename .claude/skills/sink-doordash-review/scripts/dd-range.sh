#!/bin/bash
# Print Transactions totals for a custom date range: Net total, Sales, Commission & fees, Marketing spend, Amendments.
# Use for a week not yet paid out. Run from Financials > Transactions.
# usage: dd-range.sh <session> <start M/D/YYYY> <end M/D/YYYY>
set -u
S=$1
res() { sed -n '/### Result/{n;p}'; }
ref() { playwright-cli -s $S snapshot 2>&1 | grep -E "$1" | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2; }
label() { node -e 'const [m,d,y]=process.argv[1].split("/");const t=new Date(+y,m-1,+d);console.log(t.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}))' "$1"; }
month() { node -e 'const [m,d,y]=process.argv[1].split("/");console.log(new Date(+y,m-1,1).toLocaleDateString("en-US",{month:"long",year:"numeric"}))' "$1"; }
pick() { # navigate the picker to the date's month, then click the day
  local want; want=$(month "$1")
  for i in $(seq 1 24); do
    cur=$(playwright-cli -s $S snapshot 2>&1 | grep -oE 'grid "[A-Z][a-z]+ [0-9]{4}"' | head -1 | cut -d'"' -f2)
    [ "$cur" = "$want" ] && break
    if [ "$(node -e 'console.log(new Date(process.argv[1])<new Date(process.argv[2])?"prev":"next")' "1 $want" "1 $cur")" = prev ]; then d="Previous month"; else d="Next month"; fi
    playwright-cli -s $S click "$(ref "button \"$d\"")" >/dev/null 2>&1; sleep 1
  done
  R=$(ref "button \"$(label "$1")\""); [ -n "$R" ] || { echo "FAIL: no day $1"; exit 1; }
  playwright-cli -s $S click $R >/dev/null 2>&1; sleep 1
}
playwright-cli -s $S eval "() => { const p=document.querySelector('[data-testid=entry-point-popover] button'); if(p) p.click(); return 1; }" >/dev/null 2>&1
playwright-cli -s $S click "$(ref 'button "(Last [0-9]+ days|[A-Z][a-z]{2} [0-9]+)')" >/dev/null 2>&1; sleep 2
playwright-cli -s $S click "$(ref 'menuitem "Custom date range"')" >/dev/null 2>&1; sleep 2
pick "$2"; pick "$3"
playwright-cli -s $S click "$(ref 'button "Apply"')" >/dev/null 2>&1; sleep 8
playwright-cli -s $S eval "() => document.body.innerText" 2>&1 | res | node -e 'const t=JSON.parse(require("fs").readFileSync(0,"utf8"));const i=t.indexOf("To track real-time orders");const s=t.slice(i+50);console.log(s.slice(0,s.indexOf("Transactions\n")+12).replace(/\n/g," | "))'

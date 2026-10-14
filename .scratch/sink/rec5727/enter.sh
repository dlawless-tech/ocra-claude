#!/bin/bash
# enter.sh NUM DATE AMT ACCT VENDOR MEMO  (VENDOR "" = none)
NUM="$1"; DT="$2"; AMT="$3"; ACCT="$4"; VEN="$5"; MEMO="$6"
P="playwright-cli -s=sinkrec"; H=https://journeygroup.restaurant365.com
r(){ grep -oE "$1 \[ref=[^]]+" n.yml | head -1 | grep -oE 'f?[0-9]*e[0-9]+$'; }
snap(){ $P snapshot 2>/dev/null > n.yml; }
$P goto "$H/react/home" >/dev/null 2>&1; sleep 3
$P goto "$H/#/form/BankExpenseForm/00000000-0000-0000-0000-000000000000" >/dev/null 2>&1; sleep 10; snap
grep -q 'combobox "Select Checking Account" \[ref=[^]]*\]: 20250' n.yml || { echo "FAIL $NUM: account"; exit 1; }
$P fill $(r 'textbox "Number\*"') "$NUM" >/dev/null 2>&1
if [ -n "$VEN" ]; then $P click $(r 'combobox "Select Vendor"') >/dev/null 2>&1; $P type "$VEN" >/dev/null 2>&1; sleep 3; snap
  O=$(grep -F "option \"$VEN" n.yml | head -1 | grep -oE 'ref=f?[0-9]*e[0-9]+' | cut -d= -f2); [ -n "$O" ] || { echo "FAIL $NUM: vendor"; exit 1; }
  $P click $O >/dev/null 2>&1; sleep 3
  for i in 1 2 3; do $P eval "() => { const td=document.querySelector(\"#bankExpenseDetailsGrid tbody tr td:last-child .k-grid-delete\"); if(td) td.click(); return 1 }" >/dev/null 2>&1; sleep 1; done; snap; fi
$P fill $(r 'textbox "Check Memo"') "$MEMO" >/dev/null 2>&1
$P fill $(r 'combobox "Date\*"') "$DT" >/dev/null 2>&1; $P press Tab >/dev/null 2>&1
snap; $P click $(r 'combobox "Select Account"') >/dev/null 2>&1; $P type "$ACCT" >/dev/null 2>&1; sleep 3; snap
O=$(grep -E "option \"$ACCT " n.yml | head -1 | grep -oE 'ref=f?[0-9]*e[0-9]+' | cut -d= -f2); [ -n "$O" ] || { echo "FAIL $NUM: acct"; exit 1; }
$P click $O >/dev/null 2>&1; sleep 1; snap
AM=$(grep -A2 'combobox "Select Account"' n.yml | grep -oE 'textbox \[ref=f?[0-9]*e[0-9]+' | head -1 | grep -oE 'f?[0-9]*e[0-9]+$')
$P fill $AM "$AMT" >/dev/null 2>&1; $P press Tab >/dev/null 2>&1; snap
$P click $(r 'button "Add"') >/dev/null 2>&1; sleep 2; snap
Nn=$(grep -oE 'button "No" \[ref=[^]]+' n.yml | head -1 | grep -oE 'f?[0-9]*e[0-9]+$'); if [ -n "$Nn" ]; then $P click $Nn >/dev/null 2>&1; sleep 1; snap; $P click $(r 'button "Add"') >/dev/null 2>&1; sleep 2; snap; fi
$P fill $(r 'textbox "Amount"') "$AMT" >/dev/null 2>&1; $P press Tab >/dev/null 2>&1; sleep 1
CHK=$($P eval '() => { const g=jQuery("#bankExpenseDetailsGrid").data("kendoGrid"); const s=angular.element(document.querySelector("#bankExpenseDetailsGrid")).scope(); return JSON.stringify(g.dataSource.data().map(r=>r.glAccount+"|"+r.amount)) }' 2>/dev/null | sed -n '/### Result/{n;p}')
node -e "const a=JSON.parse(JSON.parse(process.argv[1]));process.exit(a.length===1&&a[0].startsWith(process.argv[2])&&Math.abs(+a[0].split(\"|\")[1]-+process.argv[3])<0.005?0:1)" "$CHK" "$ACCT" "$AMT" || { echo "FAIL $NUM: lines $CHK"; exit 1; }
snap; $P click $(r 'button "Approve"') >/dev/null 2>&1; sleep 2; snap
$P click $(grep -A3 'button "Approve" \[expanded' n.yml | grep -oE 'button "Approve" \[ref=[^]]+' | tail -1 | grep -oE 'f?[0-9]*e[0-9]+$') >/dev/null 2>&1; sleep 6; snap
grep -q 'generic \[ref=[^]]*\]: Approved' n.yml && echo "OK $NUM $DT $AMT $ACCT $VEN $CHK" || { echo "FAIL $NUM: not approved"; exit 1; }

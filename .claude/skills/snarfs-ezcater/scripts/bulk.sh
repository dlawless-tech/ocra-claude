#!/bin/bash
# Approve, Unapprove or Delete EZ Cater Fees entries in bulk from All Transactions: filter, select all, Edit Selected > action.
# usage: bulk.sh <session> <Approve|Unapprove|Delete> <Approved|Unapproved> [TransactionId ...]
# With ids, only those entries are selected; without, every EZ Cater Fees entry in that status. Prints the rows it acted on.
set -u
S=$1; ACT=$2; ST=$3; shift 3
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
res() { sed -n '/### Result/{n;p;}'; }
ref() { grep -m1 "$1" bulk.snap | grep -oE 'ref=[^]]*' | cut -d= -f2; }
IDS=$(printf "'%s'," "$@"); IDS="[${IDS%,}]"; [ $# -eq 0 ] && IDS="[]"
while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
playwright-cli -s=$S goto https://snarfsstl.restaurant365.com/react/home >/dev/null 2>&1; sleep 15
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); dispatchEvent(new PopStateEvent('popstate')); return 1 }" >/dev/null 2>&1
R=nogrid
for i in 1 2 3 4 5 6; do sleep 15
  R=$(playwright-cli -s=$S eval "async () => { const docs=[]; const walk=d=>{docs.push(d); for(const f of d.querySelectorAll('iframe')){try{f.contentDocument&&walk(f.contentDocument)}catch(e){}}}; walk(document);
    for (const d of docs){ const jq=d.defaultView.jQuery; if(!jq) continue; const g=jq('[data-role=grid]').data('kendoGrid'); if(!g) continue;
      const ids=$IDS; const f=[{field:'Number',operator:'eq',value:'EZ Cater Fees'},{field:'ApprovalStatus',operator:'eq',value:'$ST'}];
      if(ids.length) f.push({logic:'or',filters:ids.map(v=>({field:'TransactionId',operator:'eq',value:v}))});
      g.dataSource.pageSize(200); g.dataSource.filter({logic:'and',filters:f}); await new Promise(r=>setTimeout(r,12000));
      return g.dataSource.view().map(x=>[new Date(x.Date).toLocaleDateString('en-US'),x.Location,x.TransactionId,x.Amount].join('|')).join(';') || 'none'; }
    return 'nogrid' }" 2>&1 | res | tr -d '"')
  [ "$R" != nogrid ] && [ -n "$R" ] && break
done
case "$R" in nogrid|"") echo "FAIL: grid did not load"; exit 1;; none) echo "none"; exit 0;; esac
N=$(echo "$R" | tr ';' '\n' | grep -c .)
[ $# -eq 0 ] || [ "$N" -eq $# ] || { echo "FAIL: grid shows $N rows for $# ids"; exit 1; }
bash "$HERE/snapshot.sh" $S bulk.snap
H=$(awk '/columnheader/{f=1} f&&/checkbox/{print; exit}' bulk.snap | grep -oE 'ref=[^]]*' | cut -d= -f2)
[ -n "$H" ] || { echo "FAIL: no select-all checkbox"; exit 1; }
playwright-cli -s=$S click $H >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click "$(ref 'menuitem "Edit Selected"')" >/dev/null 2>&1; sleep 2
bash "$HERE/snapshot.sh" $S bulk.snap
M=$(ref "menuitem \"$ACT\""); [ -n "$M" ] || { echo "FAIL: no $ACT item"; exit 1; }
playwright-cli -s=$S click $M >/dev/null 2>&1; sleep 5
# Delete asks to confirm
bash "$HERE/snapshot.sh" $S bulk.snap
Y=$(grep -E 'button "(Yes|OK|Ok|Delete|Confirm)"' bulk.snap | grep -v menuitem | tail -1 | grep -oE 'ref=[^]]*' | cut -d= -f2)
[ "$ACT" = Delete ] && [ -n "$Y" ] && { playwright-cli -s=$S click $Y >/dev/null 2>&1; sleep 5; }
rm -f bulk.snap; sleep 15
echo "$R" | tr ';' '\n' | sed "s/^/$ACT /"

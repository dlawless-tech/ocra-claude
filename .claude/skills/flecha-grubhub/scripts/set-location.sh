#!/bin/bash
# Move a Grubhub bank deposit's 1242 line to a store: Adjustments tab, Edit, Location, Edit Complete, Save and Close.
# usage: set-location.sh <session> <BD number> <location, e.g. "101 - Flecha HB">
# Prints "OK <BD> <location>" or "FAIL: ..." (nothing saved on a FAIL before the save).
set -u
S=$1; BD=$2; LOC=$3
APP=https://flecha.restaurant365.com; P="playwright-cli -s=$S"; G=bankDepositDetailsGrid
SN="$(cd "$(dirname "$0")" && pwd)/../../flecha-doordash/scripts/snapshot.sh"
res() { sed -n '/### Result/{n;p;q;}' | sed 's/^"//;s/"$//'; }
fail() { echo "FAIL: $BD $1"; exit 1; }
ref() { grep -m1 "$1" ed.txt | grep -oE 'ref=[^]]*' | cut -d= -f2; }
lines() { $P eval "async () => { const d=await fetch('/ServiceStack/GetTransactionDetails',{method:'POST',headers:{'content-type':'application/json; charset=UTF-8','accept':'application/json','x-r365-client-app':'angular'},body:JSON.stringify({transactionId:'$ID',transactionType:0})}).then(r=>r.json()); return d.filter(x=>/^1242 /.test(x.glAccount)).map(x=>x.location).join(';'); }" 2>&1 | res; }

# id from All Transactions; its grid lives a frame down
$P goto "$APP/react/accounting/legacy/AllTransactions" >/dev/null 2>&1; sleep 30
ID=$($P eval "async () => { const docs=[]; const walk=w=>{try{docs.push(w.document);for(const f of w.document.querySelectorAll('iframe,frame')){try{walk(f.contentWindow)}catch(e){}}}catch(e){}}; walk(window);
const d=docs.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid')); if(!d) return 'none';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); g.dataSource.filter({field:'Number',operator:'eq',value:'$BD'});
await new Promise(r=>setTimeout(r,10000)); const v=Array.from(g.dataSource.view()); return v.length===1?v[0].TransactionId:'count '+v.length; }" 2>&1 | res)
[[ "$ID" =~ ^[0-9a-f-]{36}$ ]] || fail "not found in All Transactions ($ID)"
[ "$(lines)" = "$LOC" ] && { echo "OK $BD $LOC (already)"; exit 0; }

$P goto about:blank >/dev/null 2>&1; $P goto "$APP/#/form/BankDepositForm/$ID" >/dev/null 2>&1
for i in $(seq 1 10); do sleep 4; N=$($P eval "() => { const g=jQuery('#$G').data('kendoGrid'); return g?g.dataSource.data().length:0 }" 2>&1 | res); [ "${N:-0}" -gt 0 ] && break; done
[ "${N:-0}" = 1 ] || fail "expected one deposit line, found ${N:-0}"
bash $SN $S ed.txt; R=$(ref '"Adjustments"'); [ -n "$R" ] || fail "no Adjustments tab"; $P click $R >/dev/null 2>&1; sleep 3
bash $SN $S ed.txt; R=$(ref 'button "Edit"'); [ -n "$R" ] || fail "no Edit button"; $P click $R >/dev/null 2>&1; sleep 4
bash $SN $S ed.txt; grep -q 'button "Edit Complete"' ed.txt || fail "edit mode did not open"
U=$($P eval "() => { const m=jQuery('#$G').data('kendoGrid').dataSource.data()[0]; return /^1242 /.test(m.glAccount)?m.uid:'ERR '+m.glAccount; }" 2>&1 | res)
case "$U" in ERR*) fail "line account: $U";; esac
C=$($P eval "() => Array.from(jQuery('#$G').data('kendoGrid').thead.find('th')).map(t=>t.innerText.trim()).indexOf('Location')+1" 2>&1 | res)
[ "${C:-0}" -gt 0 ] || fail "no Location column"
# a click only focuses the cell; Enter opens the editor
$P click "#$G tr[data-uid=\"$U\"] td:nth-child($C)" >/dev/null 2>&1; sleep 1; $P press Enter >/dev/null 2>&1; sleep 1
[ "$($P eval "() => document.activeElement.placeholder||''" 2>&1 | res)" = "Select Location" ] || fail "location editor did not open"
$P press Control+a >/dev/null 2>&1; $P type "${LOC%% *}" >/dev/null 2>&1; sleep 3
bash $SN $S ed.txt; O=$(ref "option \"$LOC\""); [ -n "$O" ] || fail "no option $LOC"; $P click $O >/dev/null 2>&1; sleep 1
$P press Tab >/dev/null 2>&1; sleep 1; $P press Escape >/dev/null 2>&1; sleep 1
GOT=$($P eval "() => jQuery('#$G').data('kendoGrid').dataSource.getByUid('$U').location" 2>&1 | res)
[ "$GOT" = "$LOC" ] || fail "editor reads back $GOT"
bash $SN $S ed.txt; $P click $(ref 'button "Edit Complete"') >/dev/null 2>&1; sleep 3
bash $SN $S ed.txt; R=$(grep 'button "Save"' ed.txt | grep -v disabled | tail -1 | grep -oE 'ref=[^]]*' | cut -d= -f2); $P hover $R >/dev/null 2>&1; sleep 1
$P eval "() => { const li=Array.from(document.querySelectorAll('li')).find(l=>l.offsetParent&&/^Save/.test(l.innerText.trim())&&l.querySelector('ul')); if(!li) return 'none'; const it=Array.from(li.querySelectorAll('ul li a, ul li button, ul li')).filter(a=>a.innerText.trim()==='Save and Close'); if(!it.length) return 'none'; it[it.length-1].click(); return 'ok'; }" >/dev/null 2>&1
sleep 10
# Edit Complete can save on its own and leave no Save menu; trust only the server copy
GOT=$(lines); [ "$GOT" = "$LOC" ] || fail "server copy reads $GOT"
echo "OK $BD $LOC"

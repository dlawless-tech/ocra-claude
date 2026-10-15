#!/bin/bash
# Set the 1242 tip line and the 2200 Gratuity line on an approved event JE, then Edit Complete + Save and Close.
# usage: set-tip.sh <session> <entry id> <tip line comment> <tip amount> <gratuity amount>
# Rereads the entry after saving: a closed period saves nothing, so prints SAVED only when both lines read back.
SK=$(cd "$(dirname "$0")" && pwd)
set -u; S=$1; D=$2; TC=$3; AMT=$4; GA=$5; SN="$SK/../../bowery-ubereats/scripts/snapshot.sh"
res() { sed -n '/### Result/{n;p;q;}' | sed 's/^"//;s/"$//'; }
ref() { grep -m1 "$1" ed.txt | grep -oE 'ref=[^]]*' | cut -d= -f2; }
fail() { echo "FAIL: $1"; exit 1; }
playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "https://frankiesspuntino.restaurant365.com/#/form/JournalEntryForm/$D" >/dev/null 2>&1
for i in $(seq 1 10); do sleep 4; N=$(playwright-cli -s=$S eval "() => { const g=jQuery('#journalEntryDetailsGrid').data('kendoGrid'); return g?g.dataSource.data().length:0 }" 2>&1 | res); [ "${N:-0}" -gt 0 ] && break; done
[ "${N:-0}" -gt 0 ] || fail "grid did not load (logged out? run r365-login.sh)"
bash $SN $S ed.txt; R=$(ref 'button "Edit"'); [ -n "$R" ] || fail "no Edit button"; playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 4
bash $SN $S ed.txt; grep -q 'button "Edit Complete"' ed.txt || fail "edit mode did not open"
GOT=$(playwright-cli -s=$S eval "() => { const d=Array.prototype.slice.call(jQuery('#journalEntryDetailsGrid').data('kendoGrid').dataSource.data());
 const t=d.filter(r=>r.glAccount==='1242 - Tripleseat Receivable'&&(r.comment||'').trim()==='$TC'); const g=d.filter(r=>r.glAccount==='2200 - Tips Payable'&&(r.comment||'').trim()==='Gratuity');
 if(t.length!==1||g.length!==1) return 'STOP tip lines '+t.length+' gratuity lines '+g.length;
 t[0].set('debit',$AMT); t[0].set('credit',0); t[0].dirty=true; g[0].set('credit',$GA); g[0].set('debit',0); g[0].dirty=true;
 const dr=d.reduce((s,m)=>s+(+m.debit||0),0), cr=d.reduce((s,m)=>s+(+m.credit||0),0); return Math.abs(dr-cr)<0.005?'ok':'STOP unbalanced '+dr.toFixed(2)+' '+cr.toFixed(2); }" 2>&1 | res)
[ "$GOT" = ok ] || fail "$GOT (nothing saved)"
bash $SN $S ed.txt; playwright-cli -s=$S click $(ref 'button "Edit Complete"') >/dev/null 2>&1; sleep 3
bash $SN $S ed.txt; R=$(grep 'button "Save"' ed.txt | grep -v disabled | tail -1 | grep -oE 'ref=[^]]*' | cut -d= -f2); playwright-cli -s=$S hover $R >/dev/null 2>&1; sleep 1
X=$(playwright-cli -s=$S eval "() => { const li=Array.from(document.querySelectorAll('li')).find(l=>l.offsetParent&&/^Save/.test(l.innerText.trim())&&l.querySelector('ul')); if(!li) return 'none'; const it=Array.from(li.querySelectorAll('ul li a, ul li button, ul li')).filter(a=>a.innerText.trim()==='Save and Close'); if(!it.length) return 'none'; it[it.length-1].click(); return 'ok'; }" 2>&1 | res)
[ "$X" = ok ] || fail "Save and Close not found"
sleep 10
# reread through the API
BACK=$(bash "$SK/entries.sh" $S -a "$D" | grep -E "^   (1242 - Tripleseat Receivable \| $(printf '%.2f' $AMT) \| 0.00 \| $TC|2200 - Tips Payable \| 0.00 \| $(printf '%.2f' $GA) \| Gratuity)$" | wc -l)
[ "$BACK" = 2 ] || fail "lines did not read back after save (closed period?)"
echo "SAVED $D"

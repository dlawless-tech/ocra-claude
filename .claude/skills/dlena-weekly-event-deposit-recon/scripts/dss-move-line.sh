#!/bin/bash
# usage: dss-move-line.sh <session> <dss id> <from acct> <side debit|credit> <amount> <comment> <to acct>
# moves one existing DSS JE line to another account, then Edit Complete + Save and Close
SK=$(cd "$(dirname "$0")" && pwd)
set -u; S=$1; D=$2; FROM=$3; SIDE=$4; AMT=$5; CM=$6; TO=$7; SN="$SK/../../bowery-ubereats/scripts/snapshot.sh"
res() { sed -n '/### Result/{n;p;q;}' | sed 's/^"//;s/"$//'; }
fail() { echo "FAIL: $1 (nothing saved)"; exit 1; }
jsq() { node -e 'const B=String.fromCharCode(92),Q=String.fromCharCode(39),D=String.fromCharCode(34);process.stdout.write(Q+JSON.stringify(process.argv[1]).slice(1,-1).split(B+D).join(B+"x22").split(Q).join(B+"x27")+Q)' "$1"; }
ref() { grep -m1 "$1" "$2" | grep -oE 'ref=[^]]*' | cut -d= -f2; }
playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "https://unoatfifth.restaurant365.com/#/form/dailysalessummaryform/$D" >/dev/null 2>&1
for i in $(seq 1 10); do sleep 4; N=$(playwright-cli -s=$S eval "() => { const g=jQuery('#DSSJournalEntryGrid').data('kendoGrid'); return g?g.dataSource.data().length:0 }" 2>&1 | res); [ "${N:-0}" -gt 0 ] && break; done
[ "${N:-0}" -gt 0 ] || fail "grid did not load"
bash $SN $S ed.txt; playwright-cli -s=$S click $(ref 'tab "Journal Entry"' ed.txt) >/dev/null 2>&1; sleep 3
bash $SN $S ed.txt; playwright-cli -s=$S click $(ref 'button "Edit"' ed.txt) >/dev/null 2>&1; sleep 4
bash $SN $S ed.txt; grep -q 'button "Edit Complete"' ed.txt || fail "edit mode did not open"
U=$(playwright-cli -s=$S eval "() => { const d=jQuery('#DSSJournalEntryGrid').data('kendoGrid').dataSource.data(); const h=[]; for(let k=0;k<d.length;k++) if(d[k].glAccount===$(jsq "$FROM") && Math.abs(d[k].$SIDE-$AMT)<0.005 && (d[k].comment||'')===$(jsq "$CM")) h.push(d[k].uid); return h.length===1?h[0]:'COUNT'+h.length; }" 2>&1 | res)
case "$U" in COUNT*) fail "line $FROM $SIDE $AMT '$CM' found $U";; esac
ROW="#DSSJournalEntryGrid tr[data-uid=\"$U\"]"
playwright-cli -s=$S click "$ROW td:nth-child(2)" >/dev/null 2>&1; sleep 1
playwright-cli -s=$S press Control+a >/dev/null 2>&1; playwright-cli -s=$S type "${TO%% *}" >/dev/null 2>&1; sleep 3
bash $SN $S ed.txt; O=$(ref "option \"$TO\"" ed.txt); [ -n "$O" ] || fail "no option $TO"; playwright-cli -s=$S click $O >/dev/null 2>&1; sleep 1
playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Escape >/dev/null 2>&1; sleep 1
G=$(playwright-cli -s=$S eval "() => { const d=jQuery('#DSSJournalEntryGrid').data('kendoGrid').dataSource.getByUid('$U'); return [d.glAccount,(+d.$SIDE).toFixed(2),d.comment||'',d.location].join('|'); }" 2>&1 | res)
[ "$G" = "$TO|$(node -e "console.log((+process.argv[1]).toFixed(2))" "$AMT")|$CM|10200 - d'lena" ] || fail "read back $G"
bash $SN $S ed.txt; playwright-cli -s=$S click $(ref 'button "Edit Complete"' ed.txt) >/dev/null 2>&1; sleep 3
bash $SN $S ed.txt; R=$(grep 'button "Save"' ed.txt | grep -v disabled | tail -1 | grep -oE 'ref=[^]]*' | cut -d= -f2); playwright-cli -s=$S hover $R >/dev/null 2>&1; sleep 1
X=$(playwright-cli -s=$S eval "() => { const li=Array.from(document.querySelectorAll('li')).find(l=>l.offsetParent&&/^Save/.test(l.innerText.trim())&&l.querySelector('ul')); const it=Array.from(li.querySelectorAll('ul li a, ul li button, ul li')).filter(a=>a.innerText.trim()==='Save and Close'); if(!it.length) return 'none'; it[it.length-1].click(); return 'ok'; }" 2>&1 | res)
[ "$X" = ok ] || fail "Save and Close not found"
sleep 10; echo "SAVED $D"

#!/bin/bash
# Split one lump line of a DSS Journal Entry tab into event lines, then Edit Complete and Save and Close.
# usage: dss-edit.sh <session> <plan.json>
# plan: {"dss":"<id>","match":{"acct":"2440 - Banquet Deposits","debit":7020.05},"first":{"debit":863,"comment":"..."},
#        "add":[{"acct":"1218 - Tripleseat Receivable","debit":0.39,"credit":0,"comment":"..."}]}
SK=$(cd "$(dirname "$0")" && pwd)
set -u; S=$1; P=$(realpath "$2"); SN="$SK/../../bowery-ubereats/scripts/snapshot.sh"
res() { sed -n '/### Result/{n;p;q;}' | sed 's/^"//;s/"$//'; }
fail() { echo "FAIL: $1 (nothing saved)"; exit 1; }
j() { node -e "const p=require(process.argv[1]);const v=($1);process.stdout.write(typeof v==='object'?JSON.stringify(v):String(v))" "$(cygpath -w "$P")"; }
jsq() { node -e 'const B=String.fromCharCode(92),Q=String.fromCharCode(39),D=String.fromCharCode(34);process.stdout.write(Q+JSON.stringify(process.argv[1]).slice(1,-1).split(B+D).join(B+"x22").split(Q).join(B+"x27")+Q)' "$1"; }
ref() { grep -m1 "$1" "$2" | grep -oE 'ref=[^]]*' | cut -d= -f2; }
D=$(j p.dss); MA=$(j p.match.acct); MD=$(j p.match.debit)
playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "https://unoatfifth.restaurant365.com/#/form/dailysalessummaryform/$D" >/dev/null 2>&1
for i in $(seq 1 10); do sleep 4; N=$(playwright-cli -s=$S eval "() => { const g=jQuery('#DSSJournalEntryGrid').data('kendoGrid'); return g?g.dataSource.data().length:0 }" 2>&1 | res); [ "${N:-0}" -gt 0 ] && break; done
[ "${N:-0}" -gt 0 ] || fail "grid did not load"
bash $SN $S ed.txt; playwright-cli -s=$S click $(ref 'tab "Journal Entry"' ed.txt) >/dev/null 2>&1; sleep 3
bash $SN $S ed.txt; R=$(ref 'button "Edit"' ed.txt); [ -n "$R" ] || fail "no Edit button"; playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 4
bash $SN $S ed.txt; grep -q 'button "Edit Complete"' ed.txt || fail "edit mode did not open"
U=$(playwright-cli -s=$S eval "() => { const d=jQuery('#DSSJournalEntryGrid').data('kendoGrid').dataSource.data(); const h=[]; for(let k=0;k<d.length;k++) if(d[k].glAccount===$(jsq "$MA") && Math.abs(d[k].debit-$MD)<0.005) h.push(d[k].uid); return h.length===1?h[0]:'COUNT'+h.length; }" 2>&1 | res)
case "$U" in COUNT*) fail "match line $MA $MD found $U";; esac
ROW="#DSSJournalEntryGrid tr[data-uid=\"$U\"]"
playwright-cli -s=$S click "$ROW td:nth-child(3)" >/dev/null 2>&1; sleep 1; playwright-cli -s=$S fill '#DSSJournalEntryGrid input[name="debit"]' "$(j p.first.debit)" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Escape >/dev/null 2>&1
C=$(j p.first.comment); if [ -n "$C" ]; then playwright-cli -s=$S click "$ROW td:nth-child(5)" >/dev/null 2>&1; sleep 1; playwright-cli -s=$S fill '#DSSJournalEntryGrid input[name="comment"]' "$C" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Escape >/dev/null 2>&1; fi
G=$(playwright-cli -s=$S eval "() => { const d=jQuery('#DSSJournalEntryGrid').data('kendoGrid').dataSource.getByUid('$U'); return [d.glAccount,(+d.debit).toFixed(2),d.comment||''].join('|'); }" 2>&1 | res)
[ "$G" = "$MA|$(node -e "console.log((+process.argv[1]).toFixed(2))" "$(j p.first.debit)")|$C" ] || fail "first line read back $G"
# comment other existing lines in place: "notes":[{"acct":"1218 - Tripleseat Receivable","debit":3289.70,"comment":"..."}]
NN=$(j "(p.notes||[]).length")
for i in $(seq 0 $((NN-1))); do
 NA_=$(j "p.notes[$i].acct"); ND=$(j "p.notes[$i].debit||0"); NC=$(j "p.notes[$i].credit||0"); NM=$(j "p.notes[$i].comment")
 V=$(playwright-cli -s=$S eval "() => { const d=jQuery('#DSSJournalEntryGrid').data('kendoGrid').dataSource.data(); const h=[]; for(let k=0;k<d.length;k++) if(d[k].glAccount===$(jsq "$NA_") && Math.abs((+d[k].debit||0)-$ND)<0.005 && Math.abs((+d[k].credit||0)-$NC)<0.005) h.push(d[k].uid); return h.length===1?h[0]:'COUNT'+h.length; }" 2>&1 | res)
 case "$V" in COUNT*) fail "note line $NA_ $ND/$NC found $V";; esac
 NR="#DSSJournalEntryGrid tr[data-uid=\"$V\"]"
 playwright-cli -s=$S click "$NR td:nth-child(5)" >/dev/null 2>&1; sleep 1; playwright-cli -s=$S fill '#DSSJournalEntryGrid input[name="comment"]' "$NM" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Escape >/dev/null 2>&1
 G=$(playwright-cli -s=$S eval "() => jQuery('#DSSJournalEntryGrid').data('kendoGrid').dataSource.getByUid('$V').comment||''" 2>&1 | res)
 [ "$G" = "$NM" ] || fail "note line comment read back [$G]"
done
# re-amount other existing lines: "amounts":[{"acct":"8110 - Credit Card Fees","side":"credit","from":109.38,"to":58.18,"comment":"...","was":""}]
# found by current comment (was, default same as comment); comment set after
NM_=$(j "(p.amounts||[]).length")
for i in $(seq 0 $((NM_-1))); do
 AA=$(j "p.amounts[$i].acct"); AS=$(j "p.amounts[$i].side"); AF=$(j "p.amounts[$i].from"); AT=$(j "p.amounts[$i].to"); AMC=$(j "p.amounts[$i].comment"); AW=$(j "p.amounts[$i].was ?? p.amounts[$i].comment")
 V=$(playwright-cli -s=$S eval "() => { const d=jQuery('#DSSJournalEntryGrid').data('kendoGrid').dataSource.data(); const h=[]; for(let k=0;k<d.length;k++) if(d[k].glAccount===$(jsq "$AA") && Math.abs((+d[k].$AS||0)-$AF)<0.005 && (d[k].comment||'')===$(jsq "$AW")) h.push(d[k].uid); return h.length===1?h[0]:'COUNT'+h.length; }" 2>&1 | res)
 case "$V" in COUNT*) fail "amount line $AA $AS $AF found $V";; esac
 COL=$([ "$AS" = debit ] && echo 3 || echo 4)
 playwright-cli -s=$S click "#DSSJournalEntryGrid tr[data-uid=\"$V\"] td:nth-child($COL)" >/dev/null 2>&1; sleep 1; playwright-cli -s=$S fill "#DSSJournalEntryGrid input[name=\"$AS\"]" "$AT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Escape >/dev/null 2>&1
 G=$(playwright-cli -s=$S eval "() => (+jQuery('#DSSJournalEntryGrid').data('kendoGrid').dataSource.getByUid('$V').$AS).toFixed(2)" 2>&1 | res)
 [ "$G" = "$(node -e "console.log((+process.argv[1]).toFixed(2))" "$AT")" ] || fail "amount line read back [$G]"
 if [ "$AW" != "$AMC" ]; then
  playwright-cli -s=$S click "#DSSJournalEntryGrid tr[data-uid=\"$V\"] td:nth-child(5)" >/dev/null 2>&1; sleep 1; playwright-cli -s=$S fill '#DSSJournalEntryGrid input[name="comment"]' "$AMC" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Escape >/dev/null 2>&1
  G=$(playwright-cli -s=$S eval "() => jQuery('#DSSJournalEntryGrid').data('kendoGrid').dataSource.getByUid('$V').comment||''" 2>&1 | res)
  [ "$G" = "$AMC" ] || fail "amount line comment read back [$G]"
 fi
done
NA=$(j "(p.add||[]).length")
for i in $(seq 0 $((NA-1))); do
 A=$(j "p.add[$i].acct"); AD=$(j "p.add[$i].debit||0"); AC=$(j "p.add[$i].credit||0"); AM=$(j "p.add[$i].comment||''")
 before=$(playwright-cli -s=$S eval "() => jQuery('#DSSJournalEntryGrid').data('kendoGrid').dataSource.data().length" 2>&1 | grep -E '^[0-9]+' | head -1)
 bash $SN $S ed.txt; R=$(grep 'combobox "Select Account"' ed.txt | tail -1 | grep -oE 'ref=[^]]*' | cut -d= -f2)
 playwright-cli -s=$S click $R >/dev/null 2>&1; playwright-cli -s=$S type "${A%% *}" >/dev/null 2>&1; sleep 3
 bash $SN $S ed.txt; O=$(ref "option \"$A\"" ed.txt); [ -n "$O" ] || fail "no option $A"; playwright-cli -s=$S click $O >/dev/null 2>&1; sleep 1
 [ "$AD" != "0" ] && playwright-cli -s=$S fill '#newRowDebitInput' "$AD" >/dev/null 2>&1
 [ "$AC" != "0" ] && playwright-cli -s=$S fill '#newRowcreditInput' "$AC" >/dev/null 2>&1
 [ -n "$AM" ] && playwright-cli -s=$S fill '#newRowcommentInput' "$AM" >/dev/null 2>&1
 playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
 M=$(playwright-cli -s=$S eval "() => { const m=angular.element(document.querySelector('.grid-add-row-button')).scope().gridOptions.DSSJournalEntryGrid.newRowForm.model; const n=x=>(+String(x||0).replace(/,/g,'')).toFixed(2); return [document.querySelector('input[placeholder=\"Select Account\"]').value, !!m.glAccount, n(m.debit), n(m.credit), m.comment||'', Array.from(document.querySelectorAll('input[placeholder=\"Select Location\"]')).map(x=>x.value).join()].join('|'); }" 2>&1 | res)
 WANT="$A|true|$(node -e "console.log((+process.argv[1]).toFixed(2))" "$AD")|$(node -e "console.log((+process.argv[1]).toFixed(2))" "$AC")|$AM|10200 - d'lena"
 [ "$M" = "$WANT" ] || fail "new row $i read back [$M] want [$WANT]"
 playwright-cli -s=$S click '.grid-add-row-button' >/dev/null 2>&1; sleep 3
 after=$(playwright-cli -s=$S eval "() => jQuery('#DSSJournalEntryGrid').data('kendoGrid').dataSource.data().length" 2>&1 | grep -E '^[0-9]+' | head -1)
 [ "$after" -eq $((before+1)) ] || fail "row $i not added ($before -> $after)"
done
B=$(playwright-cli -s=$S eval "() => { const d=jQuery('#DSSJournalEntryGrid').data('kendoGrid').dataSource.data(); let dr=0,cr=0; for(let k=0;k<d.length;k++){dr+=Math.round((+d[k].debit||0)*100); cr+=Math.round((+d[k].credit||0)*100);} return dr+'|'+cr; }" 2>&1 | res)
[ "${B%|*}" = "${B#*|}" ] || fail "grid unbalanced $B"
bash $SN $S ed.txt; playwright-cli -s=$S click $(ref 'button "Edit Complete"' ed.txt) >/dev/null 2>&1; sleep 3
bash $SN $S ed.txt; SV=$(grep -B1 -A0 'button "Unapprove"' ed.txt | head -1); R=$(grep 'button "Save"' ed.txt | grep -v disabled | tail -1 | grep -oE 'ref=[^]]*' | cut -d= -f2)
playwright-cli -s=$S hover $R >/dev/null 2>&1; sleep 1
X=$(playwright-cli -s=$S eval "() => { const li=Array.from(document.querySelectorAll('li')).find(l=>l.offsetParent&&/^Save/.test(l.innerText.trim())&&l.querySelector('ul')); const it=Array.from(li.querySelectorAll('ul li a, ul li button, ul li')).filter(a=>a.innerText.trim()==='Save and Close'); if(!it.length) return 'none'; it[it.length-1].click(); return 'ok'; }" 2>&1 | res)
[ "$X" = ok ] || fail "Save and Close not found"
sleep 10; echo "SAVED $D"

#!/bin/bash
# Move one line of an event JE or bank deposit to another account (optionally recomment it), then Edit Complete + Save and Close.
# usage: move-line.sh <session> <je|bd> <entry id> <from acct> <debit|credit> <amount> <current comment> <to acct> [new comment]
SK=$(cd "$(dirname "$0")" && pwd)
set -u; S=$1; K=$2; D=$3; FROM=$4; SIDE=$5; AMT=$6; CM=$7; TO=$8; NC=${9-$7}; SN="$SK/../../bowery-ubereats/scripts/snapshot.sh"
case "$K" in je) FORM=JournalEntryForm; G=journalEntryDetailsGrid;; bd) FORM=BankDepositForm; G=bankDepositDetailsGrid;; *) echo "FAIL: kind $K"; exit 1;; esac
res() { sed -n '/### Result/{n;p;q;}' | sed 's/^"//;s/"$//'; }
fail() { echo "FAIL: $1 (nothing saved)"; exit 1; }
jsq() { node -e 'const B=String.fromCharCode(92),Q=String.fromCharCode(39),D=String.fromCharCode(34);process.stdout.write(Q+JSON.stringify(process.argv[1]).slice(1,-1).split(B+D).join(B+"x22").split(Q).join(B+"x27")+Q)' "$1"; }
ref() { grep -m1 "$1" "$2" | grep -oE 'ref=[^]]*' | cut -d= -f2; }
n2() { node -e "console.log((+process.argv[1]).toFixed(2))" "$1"; }
playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "https://frankiesspuntino.restaurant365.com/#/form/$FORM/$D" >/dev/null 2>&1
for i in $(seq 1 10); do sleep 4; N=$(playwright-cli -s=$S eval "() => { const g=jQuery('#$G').data('kendoGrid'); return g?g.dataSource.data().length:0 }" 2>&1 | res); [ "${N:-0}" -gt 0 ] && break; done
[ "${N:-0}" -gt 0 ] || fail "grid did not load (logged out? run r365-login.sh)"
if [ "$K" = bd ]; then bash $SN $S ed.txt; R=$(ref 'tab "Adjustments"' ed.txt); [ -n "$R" ] || R=$(grep -m1 '"Adjustments"' ed.txt | grep -oE 'ref=[^]]*' | cut -d= -f2); [ -n "$R" ] || fail "no Adjustments tab"; playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 3; fi
bash $SN $S ed.txt; R=$(ref 'button "Edit"' ed.txt); [ -n "$R" ] || fail "no Edit button"; playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 4
bash $SN $S ed.txt; grep -q 'button "Edit Complete"' ed.txt || fail "edit mode did not open"
U=$(playwright-cli -s=$S eval "() => { const d=jQuery('#$G').data('kendoGrid').dataSource.data(); const h=[]; for(let k=0;k<d.length;k++) if(d[k].glAccount===$(jsq "$FROM") && Math.abs(d[k].$SIDE-$AMT)<0.005 && (d[k].comment||'').trim()===$(jsq "$CM").trim()) h.push(d[k].uid); return h.length===1?h[0]:'COUNT'+h.length; }" 2>&1 | res)
case "$U" in COUNT*) fail "line $FROM $SIDE $AMT '$CM' found $U";; esac
ROW="#$G tr[data-uid=\"$U\"]"
AC=$(playwright-cli -s=$S eval "() => { const tr=document.querySelector($(jsq "$ROW")); const th=Array.from(tr.closest('.k-grid').querySelectorAll('th')).map(t=>t.innerText.trim()); return [th.indexOf('Account')+1, th.indexOf('Comment')+1].join(' '); }" 2>&1 | res)
ACI=${AC% *}; CCI=${AC#* }; [ "$ACI" -gt 0 ] && [ "$CCI" -gt 0 ] || fail "columns not found ($AC)"
# a click only focuses the cell; Enter opens the account editor
playwright-cli -s=$S click "$ROW td:nth-child($ACI)" >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Enter >/dev/null 2>&1; sleep 1
[ "$(playwright-cli -s=$S eval "() => document.activeElement.placeholder||''" 2>&1 | res)" = "Select Account" ] || fail "account editor did not open"
playwright-cli -s=$S press Control+a >/dev/null 2>&1; playwright-cli -s=$S type "${TO%% *}" >/dev/null 2>&1; sleep 3
bash $SN $S ed.txt; O=$(ref "option \"$TO\"" ed.txt); [ -n "$O" ] || fail "no option $TO"; playwright-cli -s=$S click $O >/dev/null 2>&1; sleep 1
playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Escape >/dev/null 2>&1; sleep 1
if [ "$NC" != "$CM" ]; then
 playwright-cli -s=$S click "$ROW td:nth-child($CCI)" >/dev/null 2>&1; sleep 1; playwright-cli -s=$S fill "#$G input[name=\"comment\"]" "$NC" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Escape >/dev/null 2>&1
fi
GOT=$(playwright-cli -s=$S eval "() => { const d=jQuery('#$G').data('kendoGrid').dataSource.getByUid('$U'); return [d.glAccount,(+d.$SIDE).toFixed(2),(d.comment||'').trim(),d.location].join('|'); }" 2>&1 | res)
[ "$GOT" = "$TO|$(n2 "$AMT")|$(echo "$NC" | sed 's/^ *//;s/ *$//')|1000 - Frankies 457" ] || fail "read back $GOT"
bash $SN $S ed.txt; playwright-cli -s=$S click $(ref 'button "Edit Complete"' ed.txt) >/dev/null 2>&1; sleep 3
bash $SN $S ed.txt; R=$(grep 'button "Save"' ed.txt | grep -v disabled | tail -1 | grep -oE 'ref=[^]]*' | cut -d= -f2); playwright-cli -s=$S hover $R >/dev/null 2>&1; sleep 1
X=$(playwright-cli -s=$S eval "() => { const li=Array.from(document.querySelectorAll('li')).find(l=>l.offsetParent&&/^Save/.test(l.innerText.trim())&&l.querySelector('ul')); if(!li) return 'none'; const it=Array.from(li.querySelectorAll('ul li a, ul li button, ul li')).filter(a=>a.innerText.trim()==='Save and Close'); if(!it.length) return 'none'; it[it.length-1].click(); return 'ok'; }" 2>&1 | res)
[ "$X" = ok ] || fail "Save and Close not found"
sleep 10; echo "SAVED $D"

#!/bin/bash
# holly.sh <session> <M/D/YYYY>  duplicate West Covina 9/12 Accrued Water -> Hollywood 1131
S=$1; DT=$2; AMT=1131
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
. .claude/skills/norms-grubhub/scripts/lib.sh 2>/dev/null
while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/b1c2787d-a25c-4b78-b7f4-f5d6fc55f6d2" >/dev/null 2>&1; sleep 14
playwright-cli -s=$S click '#Action > a' >/dev/null 2>&1; sleep 1
playwright-cli -s=$S eval "() => { [...document.querySelectorAll('#Action li')].find(x=>x.innerText.trim()==='Duplicate').querySelector('a').click(); return 1; }" >/dev/null 2>&1; sleep 4
bash .claude/skills/bowery-ubereats/scripts/snapshot.sh $S .scratch/h.txt; R=$(grep -E 'button "No, transaction only"' .scratch/h.txt | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
[ -n "$R" ] || { echo "$DT FAIL no dup dialog"; exit 1; }
playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 15
playwright-cli -s=$S tab-select 1 >/dev/null 2>&1 || { echo "$DT FAIL no tab"; exit 1; }; sleep 3
NEWID=$(playwright-cli -s=$S eval "() => location.hash.split('/').pop()" 2>&1 | res | tr -d '"')
playwright-cli -s=$S fill 'input[name="journalEntryDate"]' "$DT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill 'input[name="journalEntryNumber"]' "Accrued Water" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
R=$(playwright-cli -s=$S eval "() => { const H='72d6c464-4b5a-4b06-a723-72b6c0a26046'; const c=jQuery('[name=journalEntryLocation]').data('kendoComboBox'); c.value(H); c.trigger('change');
 const ds=jQuery('[data-role=grid]').data('kendoGrid').dataSource; const d=ds.data(); if(d.length!==2) return 'STOP lines';
 for(let i=0;i<2;i++){const m=d[i]; m.set('location','269 - Hollywood'); m.set('locationId',H); if(/^2285 /.test(m.glAccount)){m.set('credit',$AMT);m.set('debit',0);} else if(/^5635 /.test(m.glAccount)){m.set('debit',$AMT);m.set('credit',0);} else return 'STOP acct'; }
 return 'set'; }" 2>&1 | res)
case "$R" in *set*) ;; *) echo "$DT FAIL set $R $NEWID"; exit 1;; esac
bash .claude/skills/norms-grubhub/scripts/ribbon-menu.sh $S Save "Save" >/dev/null 2>&1; sleep 12
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 15
B=$(playwright-cli -s=$S eval "$(cat .scratch/elec/rd.js)" 2>&1 | res)
case "$B" in *'Accrued Water'*"$DT"*'269 - Hollywood'*) ;; *) echo "$DT FAIL readback $B $NEWID"; exit 1;; esac
L=$(echo "$B" | grep -oE '5635[^|]*\| 1131 \| 0 \| 269 - Hollywood|2285[^|]*\| 0 \| 1131 \| 269 - Hollywood' | wc -l)
[ "$L" = 2 ] || { echo "$DT FAIL lines $B $NEWID"; exit 1; }
approve $S "$NEWID" || { echo "$DT FAIL approve $NEWID"; exit 1; }
echo "$DT Hollywood 1131 OK $NEWID"

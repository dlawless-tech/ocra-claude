#!/bin/bash
# Add one weekly Accrued Water entry for a store that has none: copy an approved 2-line
# Accrued Water entry, repoint it to the store, set date and amount, save, verify, approve.
# Usage: new-weekly.sh <session> <source entry id> "<nnn - Store>" <M/D/YYYY> <amount>
# Prints "<date> <store> <amount> OK <new id>". A FAIL after the copy leaves an NJ-numbered
# Unapproved copy; delete it (Action > Delete) before retrying.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; SK="$HERE/../.."
S=$1; SRC=$2; STORE=$3; DT=$4; AMT=$5
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
. "$SK/norms-grubhub/scripts/lib.sh"
LID=$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.locations[process.argv[2]]||"")' "$HERE/ids.json" "$STORE")
[ -n "$LID" ] || { echo "$DT FAIL unknown store $STORE"; exit 1; }
ntabs() { playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:'; }
while [ "$(ntabs)" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$SRC" >/dev/null 2>&1; sleep 14
playwright-cli -s=$S click '#Action > a' >/dev/null 2>&1; sleep 1
playwright-cli -s=$S eval "() => { [...document.querySelectorAll('#Action li')].find(x=>x.innerText.trim()==='Duplicate').querySelector('a').click(); return 1; }" >/dev/null 2>&1; sleep 5
# the attachments prompt shows only sometimes; the copy opens in tab 1 either way
bash "$SK/bowery-ubereats/scripts/snapshot.sh" $S _dup.txt
R=$(grep -E 'button "No, transaction only"' _dup.txt | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
[ -n "$R" ] && playwright-cli -s=$S click $R >/dev/null 2>&1
for i in 1 2 3 4 5 6; do sleep 5; [ "$(ntabs)" -ge 2 ] && break; done
ID=$(playwright-cli -s=$S tab-list 2>&1 | grep -E '^- 1:' | grep -oE 'JournalEntryForm/[0-9a-f-]+' | cut -d/ -f2)
[ -n "$ID" ] || { echo "$DT FAIL no copy"; exit 1; }
playwright-cli -s=$S tab-close 1 >/dev/null 2>&1
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 15
case "$(playwright-cli -s=$S eval "() => document.querySelector('[name=journalEntryNumber]').value" 2>&1 | res)" in *NJ*) ;; *) echo "$DT FAIL $ID is not a fresh copy"; exit 1;; esac
playwright-cli -s=$S fill 'input[name="journalEntryDate"]' "$DT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill 'input[name="journalEntryNumber"]' "Accrued Water" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
R=$(playwright-cli -s=$S eval "() => { const H='$LID'; const c=jQuery('[name=journalEntryLocation]').data('kendoComboBox'); c.value(H); c.trigger('change');
 const d=jQuery('[data-role=grid]').data('kendoGrid').dataSource.data(); if(d.length!==2) return 'STOP lines';
 for(let i=0;i<2;i++){const m=d[i]; m.set('location','$STORE'); m.set('locationId',H);
  if(/^2285 /.test(m.glAccount)){m.set('credit',$AMT);m.set('debit',0);} else if(/^5635 /.test(m.glAccount)){m.set('debit',$AMT);m.set('credit',0);} else return 'STOP acct'; }
 return 'set'; }" 2>&1 | res)
case "$R" in *set*) ;; *) echo "$DT FAIL set $R $ID"; exit 1;; esac
bash "$SK/norms-grubhub/scripts/ribbon-menu.sh" $S Save "Save" >/dev/null 2>&1; sleep 12
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 15
B=$(playwright-cli -s=$S eval "$(cat "$HERE/read-je.js")" 2>&1 | res)
case "$B" in *'Accrued Water'*"$DT"*"$STORE"*) ;; *) echo "$DT FAIL readback $B $ID"; exit 1;; esac
N=$(echo "$B" | grep -oE "5635[^|]*\| $AMT \| 0 \| $STORE|2285[^|]*\| 0 \| $AMT \| $STORE" | wc -l)
[ "$N" = 2 ] || { echo "$DT FAIL lines $B $ID"; exit 1; }
approve $S "$ID" || { echo "$DT FAIL approve $ID"; exit 1; }
echo "$DT $STORE $AMT OK $ID"

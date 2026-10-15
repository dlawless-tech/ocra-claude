#!/bin/bash
# Print a DSS journal entry's lines, from the journal entry id behind an NJ number (a GL Account Detail link's entityId).
# usage: read-dss.sh <session> <journal entry id>
S=$1; HOST=https://snarfsstl.restaurant365.com
res() { sed -n '/### Result/{n;p;}'; }
playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "$HOST/#/form/JournalEntryForm/$2" >/dev/null 2>&1
H=""; for i in 1 2 3 4 5 6; do sleep 5; H=$(playwright-cli -s=$S eval "() => (Array.from(document.querySelectorAll('a[href*=dailysalessummaryform]'))[0]||{}).href||''" 2>&1 | res | tr -d '"'); [ -n "$H" ] && break; done
[ -n "$H" ] || { echo "FAIL: no DSS link on journal entry $2"; exit 1; }
playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "$H" >/dev/null 2>&1
O=""; for i in $(seq 1 8); do sleep 5; O=$(playwright-cli -s=$S eval "() => { const g=jQuery('#DSSJournalEntryGrid').data('kendoGrid'); if(!g||!g.dataSource.data().length) return ''; return document.title+'\n'+g.dataSource.data().toJSON().map(r=>[r.glAccount,r.debit,r.credit,r.comment].join(' | ')).join('\n'); }" 2>&1 | res); [ -n "$O" ] && [ "$O" != '""' ] && break; done
[ -n "$O" ] && [ "$O" != '""' ] || { echo "FAIL: DSS grid did not load"; exit 1; }
echo "DSS ${H##*/}"; printf '%b\n' "$(echo "$O" | sed 's/^"//;s/"$//')"

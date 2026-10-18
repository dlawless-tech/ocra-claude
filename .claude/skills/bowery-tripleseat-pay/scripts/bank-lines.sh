#!/bin/bash
# Select a store's operating account on the open Bank Activity page and list its unmatched Paysafe lines.
# Usage: bank-lines.sh <session> <store>
# Output: <date M/D/YYYY> | <amount> | <kind CARD PROCS or REVERSAL> | <name>
set -u
S="$1"; STORE="$2"; B="playwright-cli -s=$S"
. "$(dirname "$0")/stores.sh"; store_conf "$STORE"
popup() { $B eval "() => [...document.querySelectorAll('.r365-confirmation-popup-window')].some(w=>getComputedStyle(w).display!=='none')" 2>&1 | res; }
# account through its Kendo widget; a click on the arrow often misses
OK=$($B eval "() => { const w=jQuery('[name=bankActivityBankAcounts_input]').closest('.k-widget').find('input').filter((i,x)=>jQuery(x).data('kendoComboBox')).data('kendoComboBox'); const it=w.dataSource.data().toJSON().find(x=>x.label.startsWith('$BANK_ACCT ')); if(!it) return 'none'; w.value(it.value); w.trigger('change'); return 'ok'; }" 2>&1 | res | tr -d '"')
[ "$OK" = ok ] || { echo "FAIL: no $BANK_ACCT on Bank Activity"; exit 1; }
# refreshed-today warning: always No
for i in 1 2 3 4 5 6; do sleep 3; [ "$(popup)" = true ] && { $B click '.r365-confirmation-popup-window button[data-testid=cancelText] >> visible=true' >/dev/null 2>&1; break; }; done
sleep 8
$B eval "() => { const w=jQuery('[name=bankActivityBankAcounts_input]').closest('.k-widget').find('input').filter((i,x)=>jQuery(x).data('kendoComboBox')).data('kendoComboBox'); if(!w.text().startsWith('$BANK_ACCT ')) return 'FAIL: account reads '+w.text();
const md=d=>(d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear();
return jQuery('#BankActivityUnmatchedGrid').data('kendoGrid').dataSource.data().toJSON().filter(r=>/PAYSAFE/i.test(r.Memo||'')).sort((a,b)=>new Date(a.Date)-new Date(b.Date)).map(r=>[md(new Date(r.Date)),r.Amount.toFixed(2),(/CO ENTRY DESCR:(CARD PROCS|REVERSAL)/i.exec(r.Memo)||[,'OTHER'])[1].toUpperCase(),r.Name].join(' | ')).join('\n') || 'none'; }" 2>&1 | unjson

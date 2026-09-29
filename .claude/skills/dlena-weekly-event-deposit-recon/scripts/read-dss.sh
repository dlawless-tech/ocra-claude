# Print status and the 1218, 2340, 2440 and 8110 event lines of a DSS Journal Entry tab.
# usage: read-dss.sh <session> <DSS id>
SK=$(cd "$(dirname "$0")" && pwd)
S=$1; playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "https://unoatfifth.restaurant365.com/#/form/dailysalessummaryform/$2" >/dev/null 2>&1
for i in $(seq 1 8); do sleep 4
 O=$(playwright-cli -s=$S eval "() => { const e=jQuery('#DSSJournalEntryGrid'); const g=e.data('kendoGrid'); if(!g||!g.dataSource.data().length) return ''; const st=(document.body.innerText.match(/\b(Approved|Unapproved)\b/)||[])[0]; return st+' '+(document.title)+'\n'+g.dataSource.data().toJSON().map((r,i)=>[i,r.glAccount,r.debit,r.credit,r.comment,r.readOnly].join(' | ')).filter(l=>/ (1218|2340|2440|8110) - /.test(l)).join('\n'); }" | sed -n '/### Result/{n;p;}')
 [ -n "$O" ] && [ "$O" != '""' ] && break; done
printf '%b\n' "$(echo "$O" | sed 's/^"//;s/"$//')"

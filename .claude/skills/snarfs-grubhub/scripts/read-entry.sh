#!/bin/bash
# Print one journal entry as JSON: {id, date, status, lines: [{account, debit, credit, comment, location}]}
# usage: read-entry.sh <session> <TransactionId>
set -u
S=$1; ID=$2
playwright-cli -s=$S goto "https://snarfsstl.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1
for i in 1 2 3 4; do sleep 8
  R=$(playwright-cli -s=$S eval "() => { const \$=window.jQuery; if(!\$) return 'NOTREADY'; let lines=null;
    \$('[data-role=grid]').each((i,el)=>{const g=\$(el).data('kendoGrid'); const d=g&&g.dataSource.data(); if(d&&d.length&&d[0].glAccount&&!lines) lines=d.map(x=>({account:x.glAccount,debit:+x.debit||0,credit:+x.credit||0,comment:(x.comment||'').trim(),location:x.location}));});
    if(!lines) return 'NOTREADY';
    return JSON.stringify({id:'$ID', date:(document.querySelector('input[name=journalEntryDate]')||{}).value, status:(document.body.innerText.match(/Unapproved|Approved/)||['?'])[0], lines}); }" 2>&1 | sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d')
  case "$R" in *NOTREADY*|"") continue;; esac
  node -e 'process.stdout.write(JSON.parse(process.argv[1]))' "$R"; echo; exit 0
done
echo "FAIL: entry $ID did not load"; exit 1

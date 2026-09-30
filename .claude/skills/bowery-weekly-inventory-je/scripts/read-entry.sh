#!/bin/bash
# Reload a journal entry from the server and print it as json:
# {number, date, status, attachments[], lines[{gl, debit, credit, comment, location}]}
# Usage: read-entry.sh <session> <TransactionId>
# A goto to the url already open keeps the stale page, so bounce off the dashboard first.
set -u
S="$1"; ID="$2"
playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/react/home" >/dev/null 2>&1; sleep 3
playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 22
playwright-cli -s=$S eval "() => { const \$=window.jQuery; const v=s=>(document.querySelector(s)||{}).value;
const shown=i=>{const li=document.getElementById(i);return !!(li&&li.offsetParent)};
const att=Array.from(document.querySelectorAll('.journal-entry-form .aws-uploader-file-list-item')).map(x=>x.innerText.trim());
const g=\$('[data-role=grid]').toArray().map(e=>\$(e).data('kendoGrid')).filter(Boolean)[0];
const lines=Array.prototype.slice.call(g.dataSource.data()).map(m=>({gl:String(m.glAccount||'').trim(),debit:+m.debit||0,credit:+m.credit||0,comment:m.comment||'',location:String(m.location||'')}));
return JSON.stringify({number:v('#journalEntryNumber'),date:v('#journalEntryDate'),status:shown('Unapprove')?'Approved':shown('Approve')?'Unapproved':'?',attachments:att,lines}); }" 2>&1 \
  | sed -n '/### Result/{n;p;}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify(JSON.parse(JSON.parse(s.trim())),null,1)))'

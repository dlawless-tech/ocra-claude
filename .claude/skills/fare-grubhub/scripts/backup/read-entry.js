() => { const g = jQuery('[data-role=grid]').data('kendoGrid'); if (!g) return 'nogrid';
const st = Array.from(document.querySelectorAll('button,a')).map(b=>b.innerText.trim()).filter(t=>/^(Approve|Unapprove)$/.test(t));
return JSON.stringify({ date: document.getElementById('journalEntryDate').value, number: document.getElementById('journalEntryNumber').value,
 loc: jQuery('#journalEntryLocation').data('kendoComboBox').text(), ribbon: st,
 att: Array.from(document.querySelectorAll('a[ng-click^="AWS_S3_Uploader.getFile"]')).map(a=>a.title),
 lines: g.dataSource.data().map(m => [m.glAccount, (+m.debit||0).toFixed(2), (+m.credit||0).toFixed(2), m.comment||'', m.location]) }); }

() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); if(!g) return 'nogrid';
return JSON.stringify({ date: document.getElementById('journalEntryDate').value, number: document.getElementById('journalEntryNumber').value, hloc: jQuery('#journalEntryLocation').data('kendoComboBox').text(),
 status: (document.body.innerText.match(/\b(Approved|Unapproved)\b/)||[''])[0],
 lines: g.dataSource.data().map(m => ({ a: m.glAccount, dr: +m.debit || 0, cr: +m.credit || 0, c: m.comment, loc: m.location })) }); }

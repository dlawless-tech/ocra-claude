() => { const g = jQuery('[data-role=grid]').data('kendoGrid'); if(!g) return 'nogrid';
 return JSON.stringify({num:document.querySelector('[name="journalEntryNumber"]').value, date:document.querySelector('[name="journalEntryDate"]').value, loc:document.querySelector('[name="journalEntryLocation_input"]').value, cmt:(document.querySelector('[name="journalEntryComment"]')||{}).value,
 lines:g.dataSource.data().map(r=>({a:r.glAccount,d:r.debit,c:r.credit,l:r.location,cm:r.comment}))}); }

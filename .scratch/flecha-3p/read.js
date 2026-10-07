() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); if(!g) return 'nogrid';
return JSON.stringify({ date:jQuery('#journalEntryDate').val(), num:jQuery('#journalEntryNumber').val(), loc:jQuery('#journalEntryLocation').data('kendoComboBox').text(), cmt:jQuery('#journalEntryComment').val(),
  lines:g.dataSource.data().map(m=>({a:m.glAccount, dr:+m.debit||0, cr:+m.credit||0, loc:m.location, c:m.comment})) }); }

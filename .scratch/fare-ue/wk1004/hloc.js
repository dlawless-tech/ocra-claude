() => { const c=jQuery('#journalEntryLocation').data('kendoComboBox');
const it=c.dataSource.data().find(x=>x.locationName==='11300 - FARE Old Town'); if(!it) return 'STOP: no location 11300 - FARE Old Town';
c.value(it.locationId); c.trigger('change');
const s=angular.element(document.getElementById('journalEntryLocation')).scope();
return s.model.location===it.locationId ? 'header '+c.text() : 'STOP: header model '+s.model.location; }

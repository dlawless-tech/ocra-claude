() => { const c=jQuery('#journalEntryLocation').data('kendoComboBox');
const it=c.dataSource.data().find(x=>x.locationName==='10800 - FARE Old Post Office'); if(!it) return 'STOP: no location 10800 - FARE Old Post Office';
c.value(it.locationId); c.trigger('change');
const s=angular.element(document.getElementById('journalEntryLocation')).scope();
return s.model.location===it.locationId ? 'header '+c.text() : 'STOP: header model '+s.model.location; }

() => { const c=jQuery('#journalEntryLocation').data('kendoComboBox');
const it=c.dataSource.data().find(x=>x.locationName==='10200 - FARE 150 Riverside'); if(!it) return 'STOP: no location 10200 - FARE 150 Riverside';
c.value(it.locationId); c.trigger('change');
const s=angular.element(document.getElementById('journalEntryLocation')).scope();
return s.model.location===it.locationId ? 'header '+c.text() : 'STOP: header model '+s.model.location; }

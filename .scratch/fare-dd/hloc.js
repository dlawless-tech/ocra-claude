() => { const c=jQuery('#journalEntryLocation').data('kendoComboBox');
const it=c.dataSource.data().find(x=>x.locationName==='11200 - FARE Lakeview (W Diversey)'); if(!it) return 'STOP: no location 11200 - FARE Lakeview (W Diversey)';
c.value(it.locationId); c.trigger('change');
const s=angular.element(document.getElementById('journalEntryLocation')).scope();
return s.model.location===it.locationId ? 'header '+c.text() : 'STOP: header model '+s.model.location; }

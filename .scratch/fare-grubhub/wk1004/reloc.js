() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); const rows=Array.prototype.slice.call(g.dataSource.data());
if (rows.some(m=>m.location==='10200 - FARE 150 Riverside')) return 'lines already here';
const it=jQuery('#journalEntryLocation').data('kendoComboBox').dataSource.data().find(x=>x.locationName==='10200 - FARE 150 Riverside');
rows.forEach(m=>{ m.set('locationId', it.locationId); m.set('location', '10200 - FARE 150 Riverside'); m.dirty=true; });
return 'moved '+rows.length+' lines'; }

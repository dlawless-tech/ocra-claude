() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); const rows=Array.prototype.slice.call(g.dataSource.data());
if (rows.some(m=>m.location==='11200 - FARE Lakeview (W Diversey)')) return 'lines already here';
const it=jQuery('#journalEntryLocation').data('kendoComboBox').dataSource.data().find(x=>x.locationName==='11200 - FARE Lakeview (W Diversey)');
rows.forEach(m=>{ m.set('locationId', it.locationId); m.set('location', '11200 - FARE Lakeview (W Diversey)'); m.dirty=true; });
return 'moved '+rows.length+' lines'; }

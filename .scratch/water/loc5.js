() => {
  const wrap = document.querySelector('[name="journalEntryLocation_input"]').closest('.k-widget');
  const orig = wrap.parentElement.querySelector('input:not(.k-input), select');
  const w = jQuery(orig).data('kendoComboBox');
  const d = w.dataSource.data();
  return JSON.stringify(d.map(x=>[x.locationNumber, x.locationName, x.label, x.Location, x.locationId]));
}

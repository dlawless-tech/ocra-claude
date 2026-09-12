() => {
  const wrap = document.querySelector('[name="journalEntryLocation_input"]').closest('.k-widget');
  const orig = wrap.parentElement.querySelector('input:not(.k-input), select');
  const w = jQuery(orig).data('kendoComboBox');
  const d = w.dataSource.data();
  let idx = -1;
  for (let i = 0; i < d.length; i++) { if (d[i].locationName === '213 - North Torrance') { idx = i; break; } }
  if (idx < 0) return 'location not in list';
  w.select(idx);
  w.trigger('change');
  const sc = angular.element(orig).scope();
  if (sc) sc.$apply();
  return JSON.stringify({input: document.querySelector('[name="journalEntryLocation_input"]').value, hidden: document.querySelector('[name="journalEntryLocation"]').value});
}

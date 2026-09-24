() => {
  const wrap = document.querySelector('[name="journalEntryLocation_input"]').closest('.k-widget');
  const orig = wrap.parentElement.querySelector('input:not(.k-input), select');
  const w = jQuery(orig).data('kendoComboBox') || jQuery(orig).data('kendoDropDownList');
  if(!w) return 'orig=' + (orig ? orig.outerHTML.slice(0,200) : 'none');
  const d = w.dataSource.data();
  return JSON.stringify({total:d.length, fields:Object.keys(d[0]||{}).slice(0,20), items:d.map(x=>[x.name||x.text||x.Name, x.locationId||x.id||x.value])});
}

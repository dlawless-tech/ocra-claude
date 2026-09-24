() => {
  const g = jQuery('[data-role=grid]').toArray().map(e => jQuery(e).data('kendoGrid')).find(k => k && k.dataSource.data().some(m => m.comment === 'ar grubhub - deposit'));
  if (!g) return 'nogrid';
  const ds = g.dataSource.data();
  const ar = ds.find(m => m.comment === 'ar grubhub - deposit'), pl = ds.find(m => m.comment === 'refund & discrepancy');
  ar.set('credit', 0); ar.set('debit', 33.38);
  pl.set('debit', 0); pl.set('credit', 88.95);
  const rows = Array.from(document.querySelectorAll('tr')).map(r => Array.from(r.cells||[]).map(c => c.innerText.trim())).filter(r => r.length === 9 && /^[0-9]{4} - /.test(r[1]||'') && r[5]);
  let dr = 0, cr = 0; rows.forEach(r => { dr += +r[3].replace(/,/g,''); cr += +r[4].replace(/,/g,''); });
  return JSON.stringify({rows: rows.map(r => r[5] + ' ' + r[3] + '/' + r[4]), dr: dr.toFixed(2), cr: cr.toFixed(2)});
}

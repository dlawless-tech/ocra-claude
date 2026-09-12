() => {
  const inp = Array.from(document.querySelectorAll('input')).find(i=>i.placeholder==='Select Auto Recurrence');
  if(!inp) return 'no recurrence input';
  const wrap = inp.closest('.k-widget');
  const orig = wrap.parentElement.querySelector('input:not(.k-input), select');
  const w = jQuery(orig).data('kendoComboBox') || jQuery(orig).data('kendoDropDownList');
  if(!w) return 'no widget; orig=' + (orig?orig.outerHTML.slice(0,150):'none');
  const d = w.dataSource.data();
  const out=[]; for(let i=0;i<d.length;i++) out.push([i, d[i].name||d[i].text||d[i].label||JSON.stringify(d[i]).slice(0,80)]);
  return JSON.stringify(out);
}

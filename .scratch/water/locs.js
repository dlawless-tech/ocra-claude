() => {
  const out = {};
  const el = document.querySelector('[name="journalEntryLocation_input"]');
  if (el) {
    const w = jQuery(el).data('kendoComboBox') || jQuery(el).data('kendoDropDownList') || jQuery(el).closest('.k-widget').prev().data('kendoComboBox');
    if (w && w.dataSource) out.combo = w.dataSource.data().map(x=>({n:x.name||x.Name||x.text, id:x.locationId||x.id||x.value}));
  }
  const menus = Array.from(document.querySelectorAll('li')).filter(l=>/^(Save|Action|Unapprove|Approve)$/i.test((l.innerText||'').trim().split('\n')[0]));
  out.menuIds = menus.map(l=>l.id + ' :: ' + (l.innerText||'').trim().replace(/\n/g,' | '));
  return JSON.stringify(out).slice(0, 6000);
}

async () => { const out = []; const loc = jQuery('input[data-role=combobox]').filter((i,e)=>e.id==='bankExpenseLocation').data('kendoComboBox');
  for (const it of loc.dataSource.data().slice()) { loc.value(it[loc.options.dataValueField]); loc.trigger('change');
    await new Promise(r => setTimeout(r, 4000));
    const k = jQuery('input[data-role=combobox]').filter((i,e)=>e.id==='bankExpenseCheckingAccount').data('kendoComboBox');
    out.push(it[loc.options.dataTextField] + ': ' + k.dataSource.data().map(d => d[k.options.dataTextField]).join(' ; ')); }
  return out.join(' || '); }

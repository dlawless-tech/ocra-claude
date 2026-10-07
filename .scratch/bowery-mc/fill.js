async () => { const w = id => jQuery('input[data-role=combobox]').filter((i,e)=>e.id===id).data('kendoComboBox');
  const pick = async (id, text) => { const k = w(id); const t = k.options.dataTextField;
    let it = k.dataSource.data().find(d => d[t] === text);
    if (!it) { k.search(text); await new Promise(r => setTimeout(r, 3000)); it = k.dataSource.data().find(d => d[t] === text); }
    if (!it) return id + ' MISSING ' + text; k.value(it[k.options.dataValueField]); k.trigger('change'); await new Promise(r => setTimeout(r, 3000)); return id + ' = ' + k.text(); };
  const r = [];
  r.push(await pick('bankExpenseLocation', '200 - Cookshop'));
  r.push(await pick('bankExpenseCheckingAccount', '100-10 - Cash - Cookshop Operating (4360)'));
  r.push(await pick('vendor', 'BIG GEYSER, INC'));
  return r.join(' | '); }

() => {
  const inp = Array.from(document.querySelectorAll('input')).filter(i=>i.offsetParent && !i.readOnly);
  const info = inp.map(i=>({name:i.name, id:i.id, cls:(i.className||'').slice(0,60), val:i.value, ph:i.placeholder}));
  // recurrence dropdown options
  let opts = null;
  document.querySelectorAll('select').forEach(s=>{ if(s.offsetParent) opts = Array.from(s.options).map(o=>o.text+' => '+o.value); });
  const ddl = Array.from(document.querySelectorAll('.k-dropdown, .k-combobox')).filter(e=>e.offsetParent).map(e=>e.innerText.trim());
  return JSON.stringify({inputs: info, selectOpts: opts, dropdowns: ddl});
}

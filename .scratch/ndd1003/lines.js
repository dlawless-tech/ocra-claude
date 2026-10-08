() => { const g=window.jQuery('[data-role=grid]').data('kendoGrid'); if(!g) return 'nogrid';
  return g.dataSource.data().toJSON().filter(m=>(+m.debit||0)+(+m.credit||0)).map(m=>{ const a=m.account||m.Account||m.glAccount||{}; return [typeof a==='object'?(a.text||a.name||a.Name||JSON.stringify(a).slice(0,60)):a, m.debit, m.credit, m.comment].join('|'); }).join(' ;; '); }

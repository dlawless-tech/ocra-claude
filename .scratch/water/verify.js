() => {
  const g = jQuery('[data-role=grid]').data('kendoGrid');
  const ds = g.dataSource;
  const arr = []; for (let i=0;i<ds.data().length;i++) arr.push(ds.at(i));
  let D=0, C=0;
  arr.forEach(r=>{ D+=Number(r.debit||0); C+=Number(r.credit||0); });
  return JSON.stringify({
    num: document.querySelector('[name="journalEntryNumber"]').value,
    date: document.querySelector('[name="journalEntryDate"]').value,
    loc: document.querySelector('[name="journalEntryLocation_input"]').value,
    debit: D, credit: C,
    lines: arr.map(r=>({a:r.glAccount, d:r.debit, c:r.credit, l:r.location}))
  });
}

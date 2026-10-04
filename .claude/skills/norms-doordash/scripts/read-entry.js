() => {
  const g = window.jQuery('[data-role=grid]').data('kendoGrid');
  if(!g) return 'nogrid';
  const st=document.querySelector('#Unapprove')?'Approved':'Unapproved';
  const v=n=>(document.querySelector('input[name='+n+']')||{}).value;
  return JSON.stringify({st, date:v('journalEntryDate'), lines:g.dataSource.data().map(m=>[m.glAccount, m.debit, m.credit, m.comment, m.location])});
}

() => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'NOGRID';
const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
const q=s=>{const e=d.querySelector(s);return e&&e.value};
return JSON.stringify({date:q('#journalEntryDate'),num:q('#journalEntryNumber'),comment:q('#journalEntryComment')||'', status:(d.body.innerText.match(/Approved|Unapproved/)||[])[0], lines:g.dataSource.data().map(m=>[m.glAccount, m.debit,m.credit,m.comment,m.location])});
}

() => {
const seen=[];const walk=(d)=>{seen.push(d);for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}};walk(document);
const d=seen.find(x=>x.querySelector('input[name="journalEntryNumber"]'));
if(!d) return 'noform';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
const hdr=['journalEntryNumber','journalEntryDate'].map(n=>d.querySelector('input[name="'+n+'"]').value);
const st=(d.body.innerText.match(/(Approved|Unapproved)/)||[''])[0];
return JSON.stringify({hdr,st,rows:g?g.dataSource.data().map(r=>[r.glAccountName||r.accountName||r.glAccount||JSON.stringify(Object.keys(r)).slice(0,300),r.debit,r.credit,r.comment,r.locationName||r.location]):'nogrid'});
}

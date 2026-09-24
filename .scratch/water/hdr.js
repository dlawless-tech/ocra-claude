() => {
  const o = {};
  ['journalEntryDate','journalEntryNumber','transactionEntry','journalEntryLocation_input','journalEntryLocation'].forEach(n=>{
    const e = document.querySelector('[name="'+n+'"]'); if(e) o[n]=e.value;
  });
  const c = document.querySelector('textarea[name="comment"], #comment, [name="transactionComment"]');
  o._comment = c ? c.value : null;
  const ribbon = Array.from(document.querySelectorAll('#ribbon li, .ribbon li')).map(l=>l.id||l.innerText.trim().split('\n')[0]).filter(Boolean);
  o._ribbon = Array.from(new Set(ribbon)).slice(0,40);
  return JSON.stringify(o);
}

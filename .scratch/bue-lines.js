async () => {
await new Promise(r=>setTimeout(r,9000));
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
for (const d of seen) { const w=d.defaultView; if(!w.jQuery) continue;
  for (const el of w.jQuery('[data-role=grid]').toArray()) { const g=w.jQuery(el).data('kendoGrid'); if(!g) continue;
    const rows=g.dataSource.data(); if(!rows.length || !('comment' in rows[0] || 'Comment' in rows[0])) continue;
    return JSON.stringify(rows.map(r=>{const o=r.toJSON(); return {acct:o.accountName||o.account||o.accountNumber||o.glAccount, dr:o.debit, cr:o.credit, c:o.comment, loc:o.locationName||o.location}; }));
  } }
return 'nogrid '+location.href;
}

() => { const g=Array.from(document.querySelectorAll('[data-role=grid]')).map(e=>jQuery(e).data('kendoGrid')).filter(Boolean).find(g=>g.dataSource.data().some(m=>'comment' in m)); if(!g) return 'nogrid';
 return JSON.stringify(Array.from(g.dataSource.data()).map(m=>[m.glAccount,m.glAccountId,m.location,m.locationId,m.debit,m.credit,m.comment])); }

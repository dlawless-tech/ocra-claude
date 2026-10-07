() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); if(!g) return 'nogrid'; const o={};
 for (const m of Array.prototype.slice.call(g.dataSource.data())) { o['gl '+m.glAccount]=m.glAccountId; o['loc '+m.location]=m.locationId; } return JSON.stringify(o); }

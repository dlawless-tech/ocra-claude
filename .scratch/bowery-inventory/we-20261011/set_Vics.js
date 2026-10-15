() => {
const want = {"190-02 - Inventory-Liquor":-100.8,"510-01 - Purchases-Beverage Liquor":100.8,"190-03 - Inventory-Wine":2106.48,"510-02 - Purchases-Beverage Wine":-2106.48,"190-04 - Inventory-Beer":150.47,"510-03 - Purchases-Beverage Beer":-150.47,"190-05 - Inventory-N/A Beverage":-110.08,"510-04 - Purchases-Beverage N/A":110.08};
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
const gl = m => String(m.glAccount || '').trim();
const miss = Object.keys(want).filter(k => rows.filter(m => gl(m) === k).length !== 1);
if (rows.length !== 8 || miss.length) return 'STOP: ' + rows.length + ' lines, unmatched ' + miss.join(', ');
for (const m of rows) { const d = want[gl(m)]; m.set('debit', d > 0 ? d : 0); m.set('credit', d < 0 ? -d : 0); m.set('comment', ''); }
const dr = rows.reduce((s, m) => s + (+m.debit || 0), 0), cr = rows.reduce((s, m) => s + (+m.credit || 0), 0);
return 'set ' + rows.length + ' lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2);
}
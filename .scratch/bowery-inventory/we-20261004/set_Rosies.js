() => {
const want = {"190-02 - Inventory-Liquor":-2263.5,"510-01 - Purchases-Beverage Liquor":2263.5,"190-03 - Inventory-Wine":-201.98,"510-02 - Purchases-Beverage Wine":201.98,"190-04 - Inventory-Beer":265.83,"510-03 - Purchases-Beverage Beer":-265.83,"190-05 - Inventory-N/A Beverage":-383.7,"510-04 - Purchases-Beverage N/A":383.7};
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
const gl = m => String(m.glAccount || '').trim();
const miss = Object.keys(want).filter(k => rows.filter(m => gl(m) === k).length !== 1);
if (rows.length !== 8 || miss.length) return 'STOP: ' + rows.length + ' lines, unmatched ' + miss.join(', ');
for (const m of rows) { const d = want[gl(m)]; m.set('debit', d > 0 ? d : 0); m.set('credit', d < 0 ? -d : 0); m.set('comment', ''); }
const dr = rows.reduce((s, m) => s + (+m.debit || 0), 0), cr = rows.reduce((s, m) => s + (+m.credit || 0), 0);
return 'set ' + rows.length + ' lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2);
}
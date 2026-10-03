() => {
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
if (rows.length !== 2) return 'STOP: ' + rows.length + ' lines, want 2';
const ar = rows.find(m => /^104-07 /.test(m.glAccount)), fee = rows.find(m => /^632-02 /.test(m.glAccount));
if (!ar || !fee) return 'STOP: lines are ' + rows.map(m => m.glAccount).join(', ');
ar.set('credit', 50.13); ar.set('debit', 0);
fee.set('debit', 50.13); fee.set('credit', 0); fee.set('comment', "Sep 2026 adjustments: commissions 25.13 + program fee 25.00");
return 'set 2 lines at ' + (50.13).toFixed(2) + ' @ ' + rows.map(m => m.location).join(', ');
}
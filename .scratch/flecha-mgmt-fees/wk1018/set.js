() => {
  const fee = {"103 - Flecha 4S Ranch":4550.26,"101 - Flecha HB":6731.22,"104 - Flecha NB":6261.85,"102 - Flecha Town Square":6186.42};
  const g = jQuery('[data-role=grid]').data('kendoGrid');
  if (!g) return 'ERR no grid';
  const d = g.dataSource.data();
  if (d.length !== 8) return 'ERR lines ' + d.length;
  for (let i = 0; i < 8; i += 2) {
    const s = d[i], c = d[i + 1];
    const a = fee[s.location];
    if (a === undefined || c.location !== '100 - Corporate' || !/^7588 /.test(s.glAccount) || !/^7588 /.test(c.glAccount)) return 'ERR shape at line ' + i;
    s.set('debit', a); s.set('credit', 0);
    c.set('credit', a); c.set('debit', 0);
  }
  return JSON.stringify(g.dataSource.data().map(m => [m.location, m.debit, m.credit]));
}
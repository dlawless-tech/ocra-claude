async () => {
  const seen = []; const walk = d => { seen.push(d); for (const f of d.querySelectorAll('iframe')) { try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} } };
  walk(document);
  const d = seen.find(x => x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
  if (!d) return 'nogrid';
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  g.dataSource.filter({ logic: 'and', filters: [{ field: 'Location', operator: 'contains', value: 'Torrance' }] });
  await new Promise(r => setTimeout(r, 8000));
  const dt = x => { const D = new Date(x.Date); return (D.getMonth() + 1) + '/' + D.getDate(); };
  return g.dataSource.view().filter(x => { const D = new Date(x.Date); return D >= new Date('2026-10-01') && D <= new Date('2026-10-07'); })
    .filter(x => x.Location === 'North Torrance' && /NJ00018686/.test(x.Number)).map(x => [dt(x), x.TransactionId].join('|')).join(' ;; ');
}

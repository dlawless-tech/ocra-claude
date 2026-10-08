async () => {
  const seen = []; const walk = d => { seen.push(d); for (const f of d.querySelectorAll('iframe')) { try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} } };
  walk(document);
  const d = seen.find(x => x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
  if (!d) return 'nogrid';
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const out = [];
  for (const v of ['EZ Cater', 'NJ']) {
    g.dataSource.filter({ logic: 'and', filters: [{ field: 'Number', operator: 'contains', value: v }] });
    await new Promise(r => setTimeout(r, 8000));
    const dt = x => { const D = new Date(x.Date); return (D.getMonth() + 1) + '/' + D.getDate() + '/' + D.getFullYear(); };
    g.dataSource.view().forEach(x => out.push([dt(x), x.Number, x.Location, x.TransactionId, x.ApprovalStatus, x.Amount, x.Type].join('|')));
  }
  return [...new Set(out)].sort((a, b) => new Date(b.split('|')[0]) - new Date(a.split('|')[0])).join('\n');
}

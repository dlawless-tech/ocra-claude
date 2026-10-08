// playwright-cli eval body, on the All Transactions page: every Foodja entry as "<date>|<location>|<TransactionId>|<status>|<amount>", newest first.
async () => {
  const seen = []; const walk = d => { seen.push(d); for (const f of d.querySelectorAll('iframe')) { try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} } };
  walk(document);
  const d = seen.find(x => x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
  if (!d) return 'nogrid';
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  g.dataSource.filter({ logic: 'and', filters: [{ field: 'Number', operator: 'contains', value: 'Foodja' }] });
  await new Promise(r => setTimeout(r, 8000));
  const dt = x => { const D = new Date(x.Date); return (D.getMonth() + 1) + '/' + D.getDate() + '/' + D.getFullYear(); };
  return g.dataSource.view().slice().sort((a, b) => new Date(b.Date) - new Date(a.Date)).map(x => [dt(x), x.Location, x.TransactionId, x.ApprovalStatus, x.Amount].join('|')).join('\n');
}

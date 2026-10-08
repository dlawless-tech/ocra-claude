// playwright-cli eval body, on the All Transactions page: each store's latest EZ Cater Fees entry as "<location>|<TransactionId>".
async () => {
  const seen = []; const walk = d => { seen.push(d); for (const f of d.querySelectorAll('iframe')) { try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} } };
  walk(document);
  const d = seen.find(x => x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
  if (!d) return 'nogrid';
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  g.dataSource.filter({ logic: 'and', filters: [{ field: 'Number', operator: 'eq', value: 'EZ Cater Fees' }] });
  await new Promise(r => setTimeout(r, 8000));
  const seenLoc = {};
  for (const x of g.dataSource.view().slice().sort((a, b) => new Date(b.Date) - new Date(a.Date))) if (!seenLoc[x.Location]) seenLoc[x.Location] = x.TransactionId;
  return Object.entries(seenLoc).map(e => e.join('|')).join('\n');
}

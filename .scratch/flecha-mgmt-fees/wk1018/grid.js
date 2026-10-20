async () => {
  const docs = [];
  const walk = w => { try { docs.push(w); for (let i = 0; i < w.frames.length; i++) walk(w.frames[i]); } catch (e) {} };
  walk(window);
  const w = docs.find(x => { try { return x.jQuery && x.jQuery('[data-role=grid]').data('kendoGrid'); } catch (e) { return false; } });
  if (!w) return 'no grid';
  const g = w.jQuery('[data-role=grid]').data('kendoGrid');
  g.dataSource.pageSize(1000);
  g.dataSource.filter({logic: 'and', filters: [{field: 'Number', operator: 'contains', value: 'mgmt'}]});
  await new Promise(r => setTimeout(r, 9000));
  const dt = x => { const D = new Date(x.Date); return (D.getMonth()+1) + '/' + D.getDate() + '/' + D.getFullYear(); };
  return g.dataSource.data().filter(x => /mgmt/i.test(x.Number)).sort((a, b) => new Date(b.Date) - new Date(a.Date)).map(x => [dt(x), x.Number, x.Amount, x.ApprovalStatus, x.TransactionId, x.Location].join(' | ')).slice(0, 6).join('\n');
}

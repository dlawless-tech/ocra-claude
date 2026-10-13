async () => {
  const w = window.frames[1].frames[0];
  const g = w.jQuery('[data-role=grid]').data('kendoGrid');
  g.dataSource.pageSize(1000);
  g.dataSource.filter({logic: 'and', filters: [{field: 'Number', operator: 'contains', value: 'mgmt'}]});
  await new Promise(r => setTimeout(r, 9000));
  return g.dataSource.data().filter(x => /mgmt/i.test(x.Number)).map(x => [x.Date, x.Number, x.Amount, x.Status || x.ApprovalStatus, x.TransactionId || x.Id, x.Type].join(' | ')).slice(0, 8).join('\n');
}

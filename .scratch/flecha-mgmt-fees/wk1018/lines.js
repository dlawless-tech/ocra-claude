() => JSON.stringify(jQuery('[data-role=grid]').data('kendoGrid').dataSource.data().map(m => [m.glAccount, m.location, m.debit, m.credit, m.comment]))

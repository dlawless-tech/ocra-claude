// playwright-cli eval on a saved BankDepositForm. Returns header, adjustment lines, status and attachments.
() => {
  const GL = { '4bfaddb7': '2440', '76faddb7': '1218', '5cfaddb7': '4915', 'f2faddb7': '8110' };
  const lines = jQuery('#bankDepositDetailsGrid').data('kendoGrid').dataSource.data().toJSON();
  return JSON.stringify({
    title: document.title,
    status: (document.body.innerText.match(/\n(Approved|Unapproved)\n/) || [])[1] || '',
    date: (document.querySelector('#bankDepositDate') || {}).value,
    lines: lines.map(l => ({ account: GL[l.glAccountId.slice(0, 8)] || l.glAccountId, amount: l.total, comment: l.comment })),
    attachments: [...document.querySelectorAll('a')].filter(a => a.offsetParent && /\.(csv|xlsx?|pdf)$/i.test(a.innerText.trim())).map(a => a.innerText.trim())
  });
}

// playwright-cli eval on a saved BankDepositForm. Returns header, adjustment lines, status and attachments.
() => {
  const lines = jQuery('#bankDepositDetailsGrid').data('kendoGrid').dataSource.data().toJSON();
  return JSON.stringify({
    title: document.title,
    status: (document.body.innerText.match(/\n(Approved|Unapproved)\n/) || [])[1] || '',
    date: (document.querySelector('#bankDepositDate') || {}).value,
    lines: lines.map(l => ({ account: String(l.glAccount).split(' - ')[0], amount: l.total, location: String(l.location).split(' - ')[0], comment: String(l.comment || '').trim() })),
    attachments: [...document.querySelectorAll('a')].filter(a => a.offsetParent && /\.(csv|xlsx?|pdf)$/i.test(a.innerText.trim())).map(a => a.innerText.trim())
  });
}

() => {
  const rows = Array.from(document.querySelectorAll('tr')).map(r => Array.from(r.cells || []).map(c => c.innerText.trim()))
    .filter(t => /^\d{3}-\d{2} - /.test(t[1] || ''));
  return JSON.stringify({
    status: (document.body.innerText.match(/Unapproved|Approved/) || ['?'])[0],
    date: (document.querySelector('input[name=journalEntryDate]') || {}).value,
    location: (rows[0] || [])[6],
    lines: rows.map(t => [t[1], t[3], t[4], t[5]]),
  });
}

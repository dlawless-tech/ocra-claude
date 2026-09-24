() => {
  const rows = Array.from(document.querySelectorAll('tr')).map(r => Array.from(r.cells||[]).map(c => c.innerText.trim()));
  const L = rows.filter(r => r.length === 9 && /^[0-9]{4} - /.test(r[1]||'') && (r[5]||'').trim()).map(r => [r[1], r[3], r[4], r[5], r[6]].join(' | '));
  return JSON.stringify({url: location.href, date: (document.querySelector('input[name=journalEntryDate]')||{}).value, st: (document.body.innerText.match(/Unapproved|Approved/)||['?'])[0], L});
}

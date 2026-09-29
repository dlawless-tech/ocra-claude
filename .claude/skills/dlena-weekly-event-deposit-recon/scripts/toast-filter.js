// stdin: the JSON string toast-payments.js returns. Prints the read count and the deposit, event and prepaid tickets.
// Exits 1 unless every order of the day was read.
let s = '';
process.stdin.on('data', d => s += d).on('end', () => {
  const t = JSON.parse(s);
  const [head, ...rest] = t.split('\n');
  console.log(head);
  const m = head.match(/read (\d+) of (\d+)/);
  if (!m || m[1] !== m[2]) { console.log('FAIL: not every order was read; rerun'); process.exit(1); }
  const hits = rest.join('\n').split(/\n(?=#)/).filter(b => /Deposit Applied|OTHER: Event|Prepaid/.test(b));
  console.log(hits.join('\n') || 'none');
});

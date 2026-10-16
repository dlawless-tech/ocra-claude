// Clicks the dialog's own Run (runReport), never a card's Run behind it.
() => {
  const seen = []; const walk = d => { seen.push(d); for (const f of d.querySelectorAll('iframe')) { try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} } }; walk(document);
  const d = seen.find(x => x.querySelector('md-dialog'));
  const b = d && [...d.querySelectorAll('md-dialog button')].find(b => (b.getAttribute('ng-click') || '').includes('runReport($event)'));
  if (!b) return 'STOP: no dialog Run'; b.click(); return 'ran';
}

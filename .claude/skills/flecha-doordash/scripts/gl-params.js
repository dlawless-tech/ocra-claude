// Sets the GL Account Detail dialog: account 1239, Subtotal By Location, Full comments. Returns the dialog state.
async () => {
  const seen = []; const walk = d => { seen.push(d); for (const f of d.querySelectorAll('iframe')) { try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} } }; walk(document);
  const d = seen.find(x => x.querySelector('md-dialog')); if (!d) return 'STOP: no dialog'; const w = d.defaultView;
  const ac = d.querySelector('md-dialog md-autocomplete'); const sc = w.angular.element(ac).isolateScope().$parent; const o = sc.r365options;
  const it = (await o.querySearch('1239'))[0]; if (!it) return 'STOP: no account 1239';
  sc.$apply(() => { o.selectedItem = it; o.searchText = it.display; o.selectedItemChange(it); });
  const group = l => [...d.querySelectorAll('md-dialog span')].find(x => x.textContent.trim() === l).closest('section');
  const pick = (l, i) => { const b = [...group(l).querySelectorAll('button')][i]; const s = w.angular.element(b).scope(); if (!s.valuePair.wanted) s.$apply(() => s.buttonSelected(s.valuePair, s.param, { stopPropagation() {}, preventDefault() {} })); };
  pick('Subtotal By', 1); pick('Show Comment/Location/#', 1);
  const on = l => [...group(l).querySelectorAll('button')].map(b => !!(w.angular.element(b).scope().valuePair || {}).wanted).indexOf(true);
  return JSON.stringify({ acct: ac.querySelector('input').value, unapproved: on('Show Unapproved') === 1, subtotalLocation: on('Subtotal By') === 1, full: on('Show Comment/Location/#') === 1 });
}

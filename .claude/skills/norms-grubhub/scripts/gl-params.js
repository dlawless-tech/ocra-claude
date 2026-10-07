async () => {
// Customize dialog of GL Account Detail: account 1113 - A/R Grubhub, Subtotal By Location. Safe to re-run.
const seen = []; const walk = d => { seen.push(d); for (const f of d.querySelectorAll('iframe')) { try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} } }; walk(document);
const d = seen.find(x => x.querySelector('md-dialog'));
if (!d) return 'no dialog';
const w = d.defaultView;
const ac = Array.from(d.querySelectorAll('md-dialog md-autocomplete')).find(a => /^\d{4} - /.test((a.querySelector('input') || {}).value || ''));
if (!ac) return 'no account parameter';
const isc = w.angular.element(ac).isolateScope(); const o = isc.$parent.r365options;
const it = (await o.querySearch('1113')).find(i => /A\/R Grubhub/i.test(i.display));
if (!it) return 'no 1113 item';
isc.$parent.$apply(() => { o.selectedItem = it; o.searchText = it.display; o.selectedItemChange(it); });
const grp = lbl => Array.from(d.querySelectorAll('md-dialog span')).find(x => x.textContent.trim() === lbl).closest('section');
// the Location button toggles, so press it only while inactive
const b = Array.from(grp('Subtotal By').querySelectorAll('button'))[1];
if (!b.classList.contains('activeR365')) { const sc = w.angular.element(b).scope(); sc.$apply(() => sc.buttonSelected(sc.valuePair, sc.param, {stopPropagation() {}, preventDefault() {}})); }
await new Promise(r => setTimeout(r, 800));
const sub = Array.from(grp('Subtotal By').querySelectorAll('button')).map(x => (x.classList.contains('activeR365') ? '*' : '') + w.angular.element(x).scope().valuePair.display).join(',');
return sub + ' | ' + Array.from(d.querySelectorAll('md-dialog input')).map(i => i.value).filter(Boolean).join(';');
}

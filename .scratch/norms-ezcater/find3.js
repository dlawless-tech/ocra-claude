async () => {
const seen = []; const walk = d => { seen.push(d); for (const f of d.querySelectorAll('iframe')) { try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} } }; walk(document);
const d = seen.find(x => x.querySelector('md-dialog')); if (!d) return 'no dialog';
const w = d.defaultView;
const ac = Array.from(d.querySelectorAll('md-dialog md-autocomplete')).find(a => /^\d{4} - /.test((a.querySelector('input') || {}).value || ''));
if (!ac) return 'no account parameter';
const o = w.angular.element(ac).isolateScope().$parent.r365options;
const out = [];
for (const i of await o.querySearch('4010')) out.push(JSON.stringify(i));
return [...new Set(out)].join('\n');
}

async () => {
  const seen = []; const walk = d => { seen.push(d); for (const f of d.querySelectorAll('iframe')) { try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} } }; walk(document);
  const d = seen.find(x => x.querySelector('md-dialog')); if (!d) return 'STOP: no dialog'; const w = d.defaultView;
  const ac = d.querySelector('md-dialog md-autocomplete'); const o = w.angular.element(ac).isolateScope().$parent.r365options;
  const out = []; for (const q of ['Over','Short','Unpaid','Receivable','Clearing','Toast']) out.push(q + ': ' + (await o.querySearch(q)).map(i => i.display).join(' | '));
  return out.join('\n');
}

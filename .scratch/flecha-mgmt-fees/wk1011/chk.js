() => {
  const docs = [];
  const walk = w => { try { docs.push([w, w.document]); for (const f of w.frames) walk(f); } catch (e) {} };
  walk(window);
  const out = [];
  for (const [w, d] of docs) {
    const dlg = d.querySelector('md-dialog'); if (!dlg) continue;
    for (const b of dlg.querySelectorAll('button')) {
      const s = w.angular && w.angular.element(b).scope();
      if (s && s.valuePair) out.push((s.param && (s.param.Name || s.param.name || s.param.Label)) + ': ' + JSON.stringify(s.valuePair).slice(0, 80) + (b.classList.contains('activeR365') ? ' *' : ''));
    }
  }
  return out.join('\n');
}

() => {
  const docs = [];
  const walk = w => { try { docs.push([w, w.document]); for (let i = 0; i < w.frames.length; i++) walk(w.frames[i]); } catch (e) {} };
  walk(window);
  for (const [w, d] of docs) {
    const b = Array.from(d.querySelectorAll('md-dialog button')).find(x => (x.getAttribute('ng-click') || '').includes('runReport($event)'));
    if (b) { b.click(); return 'clicked'; }
  }
  return 'none';
}

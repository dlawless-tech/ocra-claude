() => {
  const docs = [];
  const walk = w => { try { docs.push([w, w.document]); for (let i = 0; i < w.frames.length; i++) walk(w.frames[i]); } catch (e) {} };
  walk(window);
  const out = [];
  for (const [w, d] of docs) {
    for (const lbl of ['Calendar', 'Show Unapproved']) {
      const sp = Array.from(d.querySelectorAll('span')).find(x => x.textContent.trim() === lbl);
      if (!sp || !w.angular) continue;
      const sec = sp.closest('section'); if (!sec) continue;
      for (const b of sec.querySelectorAll('button')) {
        const s = w.angular.element(b).scope();
        if (s && s.valuePair) out.push(lbl + ': ' + JSON.stringify(s.valuePair).slice(0, 100) + (b.classList.contains('activeR365') ? ' *' : ''));
      }
    }
  }
  return out.join('\n') || 'none (docs ' + docs.length + ')';
}

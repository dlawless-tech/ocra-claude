// read back what the dialog will run with: autocomplete text, date boxes, wanted buttons
() => {
  const w = [...Array(window.frames.length).keys()].map(i => window.frames[i]).find(f => { try { return !!f.document.querySelector('md-dialog') } catch (e) { return false } }), d = w.document, A = w.angular;
  const acs = [...d.querySelectorAll('md-dialog md-autocomplete input')].map(i => i.value.trim()).filter(Boolean);
  const dates = [...d.querySelectorAll('md-dialog input')].filter(i => /^\d+\/\d+\/\d{4}$/.test(i.value)).map(i => i.value);
  const wanted = [...d.querySelectorAll('md-dialog section')].map(sec => {
    const lab = sec.querySelector('span')?.textContent.trim();
    const on = [...sec.querySelectorAll('button')].filter(b => A.element(b).scope()?.valuePair?.wanted).map(b => b.textContent.trim());
    return on.length ? lab + '=' + on.join('/') : null;
  }).filter(Boolean);
  return JSON.stringify({ acs, dates, wanted });
}

() => {
  const inp = Array.from(document.querySelectorAll('input')).find(i=>i.placeholder==='Select Auto Recurrence');
  const wrap = inp.closest('.k-widget');
  const sibs = Array.from(wrap.parentElement.children).map(e=>e.tagName+'#'+(e.id||'')+'.'+(e.className||'').toString().slice(0,50));
  const w2 = jQuery(wrap).data();
  return JSON.stringify({sibs, wrapData: Object.keys(w2), wrapHtml: wrap.parentElement.outerHTML.slice(0,600)});
}

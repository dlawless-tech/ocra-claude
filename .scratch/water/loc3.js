() => {
  const el = document.querySelector('[name="journalEntryLocation_input"]');
  let n = el, path=[];
  for(let i=0;i<6 && n;i++){ path.push(n.tagName+'#'+(n.id||'')+'.'+(n.className||'').toString().slice(0,80)); n=n.parentElement; }
  const w = window.angular ? angular.element(el).scope() : null;
  return JSON.stringify({path, hasAngular: !!window.angular, scopeKeys: w ? Object.keys(w).filter(k=>!k.startsWith('$')).slice(0,40) : null});
}

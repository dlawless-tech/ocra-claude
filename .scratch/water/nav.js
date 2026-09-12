() => {
  const links = Array.from(document.querySelectorAll('a')).map(a=>({t:(a.innerText||'').trim(), h:a.getAttribute('href')||''}))
    .filter(x=>/memoriz/i.test(x.t+x.h));
  const any = Array.from(document.querySelectorAll('*')).filter(e=>/memoriz/i.test(e.textContent||'') && e.children.length===0).map(e=>e.textContent.trim()).slice(0,10);
  return JSON.stringify({links, any, url: location.href});
}

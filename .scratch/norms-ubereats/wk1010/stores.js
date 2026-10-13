async () => {
const items = new Map();
const btns = () => Array.from(document.querySelectorAll('button')).filter(b => b.id !== 'store-selector-trigger' && /•/.test(b.innerText));
let sc = btns()[0]; while (sc && sc.scrollHeight <= sc.clientHeight + 2) sc = sc.parentElement;
for (let k = 0; k < 80; k++) {
  for (const b of btns()) { const l = b.innerText.split('\n').map(x => x.trim()).filter(Boolean); items.set(l[0], l.slice(1).join(' ')); }
  if (!sc) break; const before = sc.scrollTop; sc.scrollTop += 300; await new Promise(r => setTimeout(r, 300)); if (sc.scrollTop === before) break;
}
return JSON.stringify([...items].map(([n, a]) => ({ name: n, info: a })));
}

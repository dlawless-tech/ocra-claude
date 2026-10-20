async () => { const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const want=['51','64','66','85']; const out={};
 const range=()=>{ const m=document.body.innerText.match(/Showing (\d+) through (\d+) of (\d+)/); return m?m.slice(1).map(Number):null; };
 const blocks=()=>{ const t=document.body.innerText; return t.slice(t.indexOf('Order Details\nShowing')).split(/\nOrder #/).slice(1); };
 for(let i=0;i<40;i++){ const r=range(); if(!r||r[0]<=1) break; const a=Array.from(document.querySelectorAll('a')).filter(e=>/‹\s*Previous/.test(e.textContent)); if(!a.length) break; a[0].click(); await sleep(4000); }
 for(let pg=0;pg<20;pg++){ await sleep(3000); for(const b of blocks()){ const no=b.split(' ')[0]; if(want.includes(no)) out[no]=b.slice(0,700); }
  const r=range(); if(!r||r[1]>=r[2]) break; const a=Array.from(document.querySelectorAll('a')).filter(e=>/Next\s*›/.test(e.textContent)); if(!a.length) break; a[0].click(); }
 return JSON.stringify(out); }

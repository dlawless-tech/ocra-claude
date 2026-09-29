// in-page: walk every Order Details page and list tickets carrying an OTHER, deposit or prepaid payment
async () => { const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const tab=document.querySelector('a[href="#sales-order-details"]'); if(tab) tab.click();
 const range=()=>{ const m=document.body.innerText.match(/Showing (\d+) through (\d+) of (\d+)/); return m?m.slice(1).map(Number):null; };
 const blocks=()=>{ const t=document.body.innerText; return t.slice(t.indexOf('Order Details\nShowing')).split(/\nOrder #/).slice(1); };
 // page loaded = all its order blocks rendered, and not the previous page still showing
 let prev=null;
 const ready=async()=>{ for(let i=0;i<40;i++){ await sleep(750); const r=range(); const b=blocks(); if(r&&b.length>=r[1]-r[0]+1&&b[0].split(' ')[0]!==prev){ prev=b[0].split(' ')[0]; return r; } } return null; };
 // rewind: the report keeps its last page between runs
 for(let i=0;i<40;i++){ const r=range(); if(!r||r[0]<=1) break; const a=Array.from(document.querySelectorAll('a')).filter(e=>/‹\s*Previous/.test(e.textContent)); if(!a.length) break; a[0].click();
  for(let j=0;j<30;j++){ await sleep(1000); const n=range(); if(n&&n[0]!==r[0]) break; } }
 const seen=new Set(); const out=[]; let total=0;
 for(let pg=0;pg<40;pg++){ const r=await ready(); if(!r) return 'FAIL: page did not load after '+seen.size+' orders';
  total=r[2];
  for(const b of blocks()){ const no=b.split(' ')[0]; if(seen.has(no)) continue; seen.add(no);
   // a ticket can hold several checks, each with its own Payments table
   const pays=b.split('\nPayments\n').slice(1).join('\n').split('\n').filter(l=>/^OTHER|Deposit|OpenTable|Open Table/i.test(l));
   if(pays.length){ const tot=(b.match(/TOTAL:\nBalance Due:\nTip:\n([^\n]*)/)||[])[1]; out.push('#'+no+' rc='+((b.match(/Revenue Center:\n([^\n]*)/)||[])[1]||'')+' total='+tot+'\n   '+pays.map(p=>p.split('\t').slice(0,8).join(' | ')).join('\n   ')); } }
  if(r[1]>=r[2]) break;
  const a=Array.from(document.querySelectorAll('a')).filter(e=>/Next\s*›/.test(e.textContent)); if(!a.length) break; a[0].click(); }
 return 'orders read '+seen.size+' of '+total+'\n'+out.join('\n'); }

() => { const rows=[...document.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>td.innerText.trim()).filter(Boolean)).filter(r=>r.length);
 if(!rows.some(r=>r.some(c=>/^Grand Total$/.test(c)))) return 'wait';
 const out=[]; let seen=new Set(); for(const r of rows){ const k=r.join('|'); if(r.length>=3 && r.length<20 && !seen.has(k)){seen.add(k); out.push(k);} } return out.join('\n'); }

// Emit an eval that sets one store's lines through the grid model and sums both sides.
// Lines the work file does not name are zeroed.
// usage: node set-lines.js <work.json> <loc>
const fs = require('fs');
const w = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).find(x => x.loc === process.argv[3]);
const spec = JSON.stringify(w.lines.map(l => [l.comment, l.col === 'debit' ? l.amount : 0, l.col === 'credit' ? l.amount : 0]));
process.stdout.write(`() => { const spec=${spec}; const g=Array.from(document.querySelectorAll('[data-role=grid]')).map(e=>jQuery(e).data('kendoGrid')).filter(Boolean).find(g=>g.dataSource.data().some(m=>'comment' in m)); const data=Array.from(g.dataSource.data()); const miss=[]; for(const [c,d,cr] of spec){ const m=data.find(x=>(x.comment||'').trim()===c); if(!m){miss.push(c);continue;} m.set('debit',d); m.set('credit',cr); } for(const m of data){ if(!spec.some(s=>s[0]===(m.comment||'').trim())){ m.set('debit',0); m.set('credit',0); } } let dr=0,cr=0; for(const m of data){dr+=+m.debit||0; cr+=+m.credit||0;} return JSON.stringify({miss, dr:dr.toFixed(2), cr:cr.toFixed(2)}); }`);

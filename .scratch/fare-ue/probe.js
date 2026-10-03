() => { const h=[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.innerText==='Gross Sales');
let p=h; for(let i=0;i<12&&p;i++){p=p.parentElement; if(p.innerText.includes('Amendments')&&p.innerText.includes('Net sales')) break;}
return p.outerHTML.replace(/ class="[^"]*"/g,'').replace(/<svg.*?<\/svg>/g,'').slice(0,6000); }

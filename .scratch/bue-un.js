() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d=seen.find(x=>x.querySelector('md-dialog')); const w=d.defaultView;
const sec = Array.from(d.querySelectorAll('span')).find(x => x.textContent.trim() === 'Show Unapproved').closest('section');
const b = Array.from(sec.querySelectorAll('button')).find(x => w.angular.element(x).scope().valuePair.display === 'Yes');
const s = w.angular.element(b).scope(); s.$apply(() => s.buttonSelected(s.valuePair, s.param, {stopPropagation(){}, preventDefault(){}}));
return Array.from(sec.querySelectorAll('button')).map(x=>{const v=w.angular.element(x).scope().valuePair; return v.display+':'+v.wanted;}).join(','); }

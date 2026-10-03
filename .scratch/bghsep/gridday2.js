async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d=seen.find(x=>x.querySelector('input') && /Approval Status/.test(x.body.innerText||'')); if(!d) return 'nogrid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
const dt=x=>{const D=new Date(x.Date); return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0');};
const v=g.dataSource.view();
return [Object.keys(v[0].toJSON()).join(','), ...v.filter(x=>dt(x)==='2026-09-29').map(x=>JSON.stringify(x.toJSON()).slice(0,300))]; }

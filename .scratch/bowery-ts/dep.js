() => { const $=window.jQuery; const ins=Array.from(document.querySelectorAll('input,textarea')).filter(i=>i.offsetParent&&i.value).map(i=>(i.id||i.name)+'='+i.value);
const grids=$('[data-role=grid]').toArray().map(e=>{const g=$(e).data('kendoGrid'); return g?g.dataSource.data().toJSON().map(r=>{const o={};for(const k in r){const v=r[k]; if(v!==null&&v!==''&&typeof v!=='object'&&typeof v!=='function')o[k]=v;}return o;}):null;}).filter(x=>x&&x.length);
const att=Array.from(document.querySelectorAll('a')).filter(a=>/\.pdf|\.csv|\.xlsx/i.test(a.innerText)).map(a=>a.innerText+' '+a.href);
return JSON.stringify({ins,grids,att}); }

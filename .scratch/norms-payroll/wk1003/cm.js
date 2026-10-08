() => { const $=window.jQuery; const g=$('[data-role=grid]').toArray().map(e=>$(e).data('kendoGrid')).filter(Boolean)[0];
const c={5:'22363 Garcia, Rachel Michelle',6:'22364 Martinez, Sergio',7:'22365 Petrie, Connor Elijah',115:'22366 Temoxtle, Alfredo'};
for (const [i,t] of Object.entries(c)) g.dataSource.at(+i).set('comment',t);
return [5,6,7,115].map(i=>g.dataSource.at(i).comment).join(' / '); }

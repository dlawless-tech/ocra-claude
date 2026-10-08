async () => { const g=jQuery('[data-role=grid]').data('kendoGrid'); const ds=g.dataSource; ds.pageSize(200); await new Promise(r=>setTimeout(r,1000)); const out=[];
 for(const pat of [m=>/^6335 /.test(m.glAccount), m=>/Carson/.test(m.location)]){ const m=ds.data().find(pat); if(!m){out.push('none');continue;}
  const tr=g.tbody.find('tr[data-uid='+m.uid+']'); const t=tr.find('.k-grid-delete'); if(!t.length){out.push('no trash '+m.glAccount);continue;} t.trigger('click'); t[0].click&&0; await new Promise(r=>setTimeout(r,1500)); out.push(m.glAccount+' '+m.location+' '+(ds.data().includes(m)?'STILL':'gone')); }
 const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Add'&&x.offsetParent); const del=angular.element(b).scope().gridOptions.journalEntryDetailsGrid.deletedRows;
 const d=ds.data(); let dr=0,cr=0; for(let i=0;i<d.length;i++){dr+=+d[i].debit||0;cr+=+d[i].credit||0;}
 return JSON.stringify({out,deleted:(del||[]).length,n:d.length,dr:dr.toFixed(2),cr:cr.toFixed(2)}); }

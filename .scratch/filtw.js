async () => { const V='Accrued Water';
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  if(!d) return 'no grid';
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  g.dataSource.pageSize(2000);
  await g.dataSource.filter({logic:'or', filters:[
    {field:'Number', operator:'contains', value:V},
    {field:'Name', operator:'contains', value:V}
  ]});
  const dt = x => { const D=new Date(x.Date); return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0'); };
  const v = g.dataSource.view();
  const arr=[]; for(let i=0;i<v.length;i++){const x=v[i]; arr.push([dt(x),x.Number,x.Name,x.Location,x.ApprovalStatus,x.Amount,x.TransactionType,x.TransactionId].join('\t'));}
  return arr.join('\n');
}

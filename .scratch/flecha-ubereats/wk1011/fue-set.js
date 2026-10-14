() => { const x={"weekEnding":"10/11/2026","store":"Flecha Town Square","loc":"102 - Flecha Town Square","basis":"estimate","sales":108.42,"days":2,"rate":0.5152,"fee":55.86,"comment":"Uber Eats fees estimate: sales 10/5-10/11 108.42 x 51.52% (4 wk avg)"};
const cb=jQuery('#journalEntryLocation').data('kendoComboBox');
const it=cb.dataSource.data().find(v=>v.locationName===x.loc); if(!it) return 'STOP: no location '+x.loc;
cb.value(it.locationId); cb.trigger('change');
const g=jQuery('[data-role=grid]').data('kendoGrid'); const d=Array.prototype.slice.call(g.dataSource.data());
if (d.length!==2) return 'STOP: '+d.length+' lines';
const fee=Math.abs(x.fee), dr=x.fee>=0;
for (const m of d) {
  const exp=/^7161 /.test(m.glAccount), ar=/^123[59] /.test(m.glAccount); if(!exp&&!ar) return 'STOP: line '+m.glAccount;
  if (ar) { m.set('glAccountId', '293b5f76-0674-4b91-b016-b99cd4577e44'); m.set('glAccount', '1235 - A/R - 3rd Party Delivery'); }
  m.set('locationId', it.locationId); m.set('location', x.loc);
  m.set('debit', (exp===dr)?fee:0); m.set('credit', (exp===dr)?0:fee); m.set('comment', x.comment); m.dirty=true; }
return 'set '+cb.text()+' '+fee; }

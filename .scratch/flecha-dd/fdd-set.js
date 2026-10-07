() => { const x={"weekEnding":"10/4/2026","store":"Flecha Town Square","loc":"102 - Flecha Town Square","basis":"estimate","sales":292.11,"days":4,"rate":0.3953,"fee":115.47,"comment":"DoorDash fees estimate: sales 9/28-10/4 292.11 x 39.53% (4 wk avg)"};
const cb=jQuery('#journalEntryLocation').data('kendoComboBox');
const it=cb.dataSource.data().find(v=>v.locationName===x.loc); if(!it) return 'STOP: no location '+x.loc;
cb.value(it.locationId); cb.trigger('change');
const g=jQuery('[data-role=grid]').data('kendoGrid'); const d=Array.prototype.slice.call(g.dataSource.data());
if (d.length!==2) return 'STOP: '+d.length+' lines';
const fee=Math.abs(x.fee), dr=x.fee>=0;
for (const m of d) {
  const exp=/^7161 /.test(m.glAccount), ar=/^1239 /.test(m.glAccount); if(!exp&&!ar) return 'STOP: line '+m.glAccount;
  m.set('locationId', it.locationId); m.set('location', x.loc);
  m.set('debit', (exp===dr)?fee:0); m.set('credit', (exp===dr)?0:fee); m.set('comment', x.comment); m.dirty=true; }
return 'set '+cb.text()+' '+fee; }

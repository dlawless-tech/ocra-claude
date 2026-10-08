() => { const P={"sc":77434.35,"stores":[{"l":"Anaheim","move":2167.83,"sh":54.47},{"l":"Claremont","move":3398.8,"sh":85.41},{"l":"Costa Mesa","move":3378.5,"sh":84.9},{"l":"Downey","move":3659.21,"sh":91.95},{"l":"El Monte","move":3460.35,"sh":86.95},{"l":"Hollywood","move":9805.24,"sh":246.38},{"l":"Huntington Beach","move":1538.83,"sh":38.67},{"l":"Inglewood","move":939.55,"sh":23.61},{"l":"La Cienega","move":1951.36,"sh":49.04},{"l":"Lakewood","move":2540.68,"sh":63.84},{"l":"North Torrance","move":3632.12,"sh":91.27},{"l":"Ontario","move":5208.34,"sh":130.88},{"l":"Orange","move":531.48,"sh":13.36},{"l":"Pico Rivera","move":4195.14,"sh":105.42},{"l":"Rialto","move":9689.72,"sh":243.49},{"l":"Riverside","move":8559.8,"sh":215.1},{"l":"Santa Ana","move":3421.28,"sh":85.97},{"l":"Slauson","move":1424.48,"sh":35.8},{"l":"South Torrance","move":2712.92,"sh":68.17},{"l":"Van Nuys","move":7182.72,"sh":180.49},{"l":"West Covina","move":1081.85,"sh":27.19},{"l":"Whittier","move":-1023.49,"sh":0}]}; const c='Move water accrual from Support Center to stores, true up unbilled thru 9/5';
 const ds=jQuery('[data-role=grid]').data('kendoGrid').dataSource; const all=ds.data().slice();
 if(all.length!==25) return 'STOP lines '+all.length;
 const acc=all.find(m=>/^2285 /.test(m.glAccount)&&/Support Center/.test(m.location)); if(!acc) return 'STOP no 2285';
 const gl=acc.glAccount, gid=acc.glAccountId; const byLoc={};
 for(const m of all){ if(m!==acc) byLoc[m.location.replace(/^\d+ - /,'')+'|'+m.glAccount.slice(0,4)]=m; }
 const miss=[]; let sort=100;
 for(const s of P.stores){ const m=byLoc[s.l+'|5635']; if(!m){miss.push(s.l);continue;} delete byLoc[s.l+'|5635'];
  const j=m.toJSON(); const id=crypto.randomUUID();
  const row=Object.assign(j,{transactionDetailId:id,itemVarianceCustomId:id,glAccount:gl,glAccountId:gid,debit:s.move<0?-s.move:0,credit:s.move>0?s.move:0,comment:c,detailSort:sort++});
  if(s.sh>0){ m.set('debit',s.sh); m.set('credit',0); m.set('comment',c); ds.add(row); }
  else { m.set('glAccount',gl); m.set('glAccountId',gid); m.set('debit',row.debit); m.set('credit',row.credit); m.set('comment',c); } }
 for(const k in byLoc) ds.remove(byLoc[k]);
 acc.set('debit',P.sc); acc.set('credit',0); acc.set('comment',c);
 const d=ds.data(); let dr=0,cr=0; for(let i=0;i<d.length;i++){dr+=+d[i].debit||0;cr+=+d[i].credit||0;}
 return JSON.stringify({miss,removed:Object.keys(byLoc),n:d.length,dr:dr.toFixed(2),cr:cr.toFixed(2)}); }

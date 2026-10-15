// Toast Payments report, paid 06-01-2026 to 06-14-2026 (MM-DD-YYYY), all Snarf's stores. Keeps payments whose business day differs from their order's.
async () => {
  const IDS = '400000003477906932,400000003435181874,400000003434141458,400000003478562473,400000029668556220,400000039335018801,400000061758689621';
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const p = new URLSearchParams({ reportDateRange: 'custom', reportDateStart: '06-01-2026', reportDateEnd: '06-14-2026', reportTimeRange: '-2', numberOfRestaurants: '7', reportGroupIds: IDS, sEcho: '1', iDisplayStart: '0', iDisplayLength: '100000' });
  for (let i = 0; i < 44; i++) p.append('bVisible_' + i, 'true');
  // jobs sometimes come back with the hidden columns blank; rerun until every row has its ids and dates
  let j, tries = 0; const dbg=[];
  for (; tries < 8; tries++) {
    const r = await fetch('/restaurants/admin/reports/paymentdetails', { method: 'POST', body: p, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const loc = r.headers.get('Location'); if (!loc) return 'FAIL: no job (' + r.status + ') - signed out?';
    j = null; for (let i = 0; i < 120 && !j; i++) { await sl(2000); try { const g = await fetch(loc); if (g.status == 200) j = await g.json(); } catch (e) {} }
    if (!j) return 'FAIL: job timed out';
    const z=k=>j.aaData.filter(c=>!c[k]).length; dbg.push([j.aaData.length,z(2),z(5),z(6),z(7)].join("/")+" "+JSON.stringify(j.aaData.filter(c=>c[5]&&!c[2]).slice(0,1))); if(tries>=2) return dbg.join(" || ");
  }
  if (tries == 8) return 'FAIL: columns still blank after 8 runs';
  // business day: before 4am belongs to the prior day
  const bd = s => { const m = s.match(/(\d+)\/(\d+)\/(\d+) (\d+):(\d+) (AM|PM)/); if (!m) return ''; const h = +m[4] % 12 + (m[6] == 'PM' ? 12 : 0); const d = new Date(Date.UTC(2000 + +m[3], m[1] - 1, +m[2])); if (h < 4) d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
  const out = j.aaData.map(c => ({ loc: c[0].replace(/<[^>]+>/g, '').trim(), payId: c[1], orderId: c[2], order: c[4], paid: c[5], ordered: c[6], paidBd: bd(c[5]), orderBd: bd(c[6]), check: c[8], tab: c[9], dining: c[14], amt: +c[16], tip: +c[17], grat: +c[18], total: +c[19], refunded: c[23], refundDate: c[24], refundAmt: +c[25] || 0, voidDate: c[29], status: c[30], type: c[31], other: c[34], source: c[41] }))
    .filter(x => x.paidBd != x.orderBd);
  return JSON.stringify({ rows: j.aaData.length, tries: tries + 1, advance: out });
}

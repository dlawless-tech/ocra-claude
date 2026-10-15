// Toast Payments report, paid 09-01-2026 to 09-02-2026 (MM-DD-YYYY), all Snarf's stores. Keeps payments whose business day differs from their order's.
async () => {
  const IDS = '400000003477906932,400000003435181874,400000003434141458,400000003478562473,400000029668556220,400000039335018801,400000061758689621';
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const p = new URLSearchParams({ reportDateRange: 'custom', reportDateStart: '09-01-2026', reportDateEnd: '09-02-2026', reportTimeRange: '-2', numberOfRestaurants: '7', reportGroupIds: IDS, sEcho: String(Date.now()), iDisplayStart: '0', iDisplayLength: '100000' });
  for (let i = 0; i < 44; i++) p.append('bVisible_' + i, 'true');
  const r = await fetch('/restaurants/admin/reports/paymentdetails', { method: 'POST', body: p, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
  const loc = r.headers.get('Location'); if (!loc) return 'FAIL: no job (' + r.status + ') - signed out?';
  let j; for (let i = 0; i < 120 && !j; i++) { await sl(2000); try { const g = await fetch(loc); if (g.status == 200) j = await g.json(); } catch (e) {} }
  if (!j) return 'FAIL: job timed out';
  // business day: before 4am belongs to the prior day
  const bd = s => { const m = s.match(/(\d+)\/(\d+)\/(\d+) (\d+):(\d+) (AM|PM)/); if (!m) return ''; let h = +m[4] % 12 + (m[6] == 'PM' ? 12 : 0); const d = new Date(2000 + +m[3], m[1] - 1, +m[2]); if (h < 4) d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };
  const out = j.aaData.map(c => ({ loc: c[0].replace(/<[^>]+>/g, '').trim(), payId: c[1], orderId: c[2], order: c[4], paid: c[5], ordered: c[6], paidBd: bd(c[5]), orderBd: bd(c[6]), check: c[8], tab: c[9], dining: c[14], amt: +c[16], tip: +c[17], grat: +c[18], total: +c[19], refunded: c[23], refundDate: c[24], refundAmt: +c[25] || 0, voidDate: c[29], status: c[30], type: c[31], other: c[34], source: c[41] }))
    ; const ex = j.aaData[0].slice(0,8).join(" ~ "); return JSON.stringify({ rows: j.aaData.length, noPaid: out.filter(x=>!x.paidBd).length, noOrd: out.filter(x=>!x.orderBd).length, ex });
  return JSON.stringify({ rows: j.aaData.length, advance: out });
}

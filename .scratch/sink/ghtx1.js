async () => {
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const rests = JSON.parse(localStorage.getItem('associatedRestaurants'));
const ids = rests.map(r => r.id).join(',');
const all = []; const errs = [];
const days = (a, n) => new Date(Date.parse(a + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
for (let s = '2026-06-01'; s < '2026-10-14'; s = days(s, 7)) {
  const e = days(s, 7) < '2026-10-14' ? days(s, 7) : '2026-10-14';
  const r = await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/v1/' + ids + '/transactions?timeZone=America/Denver&channelGroup=&startDate=' + s + '&endDate=' + e, {headers: H});
  const t = await r.text(); try { all.push(...JSON.parse(t)); } catch (x) { errs.push(s + ': ' + t.slice(0, 120)); }
}
return JSON.stringify({rests, errs, tx: all});
}

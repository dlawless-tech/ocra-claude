async () => {
  const tok = sessionStorage.getItem('authToken');
  const rests = JSON.parse(localStorage.getItem('associatedRestaurants'));
  const H = {authorization: 'Bearer ' + tok, accept: 'application/json', 'content-type': 'application/json'};
  const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';
  const ids = rests.map(r => r.id);
  const st = encodeURIComponent('2026-09-08T00:00:00.000Z'), en = encodeURIComponent('2026-09-24T06:59:59.000Z');
  const out = [];
  for (let i = 0; i < ids.length; i += 10) {
    const r = await fetch(base + ids.slice(i, i+10).join(',') + '/deposits/summary?startTime=' + st + '&endTime=' + en, {headers: H});
    out.push({status: r.status, body: await r.text()});
  }
  return JSON.stringify({rests: rests.map(r => ({id: r.id, name: r.name, street: r.streetAddress, city: r.city})), out});
}

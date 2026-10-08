async () => {
const tok = sessionStorage.getItem('authToken'); if (!tok) return 'STOP: no authToken, log in first';
const H = {authorization: 'Bearer ' + tok, accept: 'application/json'};
const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';
const get = async u => { const ac = new AbortController(); setTimeout(() => ac.abort(), 25000); return (await fetch(base + u, {headers: H, signal: ac.signal})).json(); };
const sum = await get('7572456,7574160,7574936,7574960,9422280,9817760,11993296,11996496,12554320,12565904,12700328,14871432,15123680/deposits/summary?startTime=2026-09-29T00:00:00.000Z&endTime=2026-10-19T23:59:59.000Z');
const out = [];
for (const [rid, deps] of Object.entries(sum)) for (const d of deps) out.push(await get(rid + '/deposits/' + d.restaurant_distribution_id));
return JSON.stringify({start: '2026-09-29', end: '2026-10-05', deposits: out});
}
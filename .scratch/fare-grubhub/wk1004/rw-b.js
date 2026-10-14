async () => {
const tok = sessionStorage.getItem('authToken'); if (!tok) return 'STOP: no authToken, log in first';
const H = {authorization: 'Bearer ' + tok, accept: 'application/json'};
const ac = new AbortController(); setTimeout(() => ac.abort(), 60000);
const r = await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/v1/7572456,7574160,7574936,7574960,9422280,9817760,11993296,11996496,12554320,12565904,12700328,14871432,15123680/transactions?timeZone=America/New_York&channelGroup=&startDate=2026-10-01&endDate=2026-10-06', {headers: H, signal: ac.signal});
if (!r.ok) return 'STOP: transactions ' + r.status;
const tx = (await r.json()).filter(t => t.transaction_type !== 'DISTRIBUTION');
return JSON.stringify({start: '2026-10-01', end: '2026-10-05', transactions: tx});
}
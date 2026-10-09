// Bowery fiscal period for a week-ending Sunday, from R365's custom period table.
// usage: node period.js <yyyy-MM-dd>  ->  {"isPeriodEnd":true,"label":"P9'26","start":"8/31/2026","end":"10/4/2026"}
// A date past the last listed period exits 2, so the next year's table gets added from R365 first.
// period ends by fiscal year, copied from R365 Fiscal Year setup (Custom Periods)
const FY = {
  2026: { start: "12/29/2025", ends: ["2/1/2026", "3/1/2026", "3/29/2026", "5/3/2026", "5/31/2026", "6/28/2026", "8/2/2026", "8/30/2026", "10/4/2026", "11/1/2026", "11/29/2026", "1/3/2027"] },
};
const ms = s => { const [m, d, y] = s.split("/").map(Number); return Date.UTC(y, m - 1, d); };
const [y, m, d] = process.argv[2].split("-").map(Number);
const t = Date.UTC(y, m - 1, d);
const fy = Object.keys(FY).find(k => ms(FY[k].start) <= t && t <= ms(FY[k].ends[11]));
if (!fy) { console.error(`no fiscal year covers ${process.argv[2]}: add it to FY from R365`); process.exit(2); }
const { start, ends } = FY[fy];
const p = ends.findIndex(e => t <= ms(e));
const prev = p ? ms(ends[p - 1]) + 864e5 : ms(start);
const fmt = x => { const D = new Date(x); return `${D.getUTCMonth() + 1}/${D.getUTCDate()}/${D.getUTCFullYear()}`; };
console.log(JSON.stringify({ isPeriodEnd: t === ms(ends[p]), label: `P${p + 1}'${fy.slice(2)}`, start: fmt(prev), end: ends[p] }));

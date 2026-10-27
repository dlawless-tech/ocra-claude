#!/bin/bash
# Foodja Order History for a date range -> [{date, order, store, total, period}] on stdout. "Sales" is the order's Restaurant Total.
# usage: orders.sh <session> <from M/D/YYYY> <through M/D/YYYY>
set -u
S=$1; FROM=$(echo "$2" | awk -F/ '{printf "%02d/%02d/%s", $1, $2, $3}'); THRU=$(echo "$3" | awk -F/ '{printf "%02d/%02d/%s", $1, $2, $3}')
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
playwright-cli -s=$S goto https://foodja.com/restaurant-portal/orders/ >/dev/null 2>&1; sleep 6
playwright-cli -s=$S eval "() => { document.querySelector('input[name=startDate]').value='$FROM'; document.querySelector('input[name=endDate]').value='$THRU'; document.querySelector('#srchSubmit').click(); return 1 }" >/dev/null 2>&1; sleep 6
# server-side table pages 10 at a time; -1 lifts it
playwright-cli -s=$S eval "() => { jQuery('#ordersTable').DataTable().page.len(-1).draw(); return 1 }" >/dev/null 2>&1; sleep 5
OUT=$(playwright-cli -s=$S eval "() => JSON.stringify({ range: [document.querySelector('input[name=startDate]').value, document.querySelector('input[name=endDate]').value], shown: (document.body.innerText.match(/Showing .* entries|No data available/)||[''])[0], rows: Array.from(document.querySelectorAll('#ordersTable > tbody > tr[role=row]')).map(r => Array.from(r.cells).slice(0, 5).map(c => c.textContent.trim())) })" 2>&1 | res)
node -e '
let o = JSON.parse(process.argv[1]); if (typeof o === "string") o = JSON.parse(o);
const [f, t] = process.argv.slice(2);
if (o.range[0] !== f || o.range[1] !== t) { console.error("FAIL: search shows " + o.range.join("-")); process.exit(1); }
const rows = o.rows.filter(r => /^\d\d\/\d\d\/\d\d$/.test(r[0]));
const m = o.shown.match(/of (\d+) entries/), want = m ? +m[1] : (/No data/.test(o.shown) ? 0 : -1);
if (want !== rows.length) { console.error("FAIL: read " + rows.length + " of " + o.shown); process.exit(1); }
const md = s => { const [a, b, c] = s.split("/"); return +a + "/" + +b + "/20" + c; };
console.log(JSON.stringify(rows.map(r => ({ date: md(r[0]), order: r[1], store: r[2], total: +r[3].replace(/[$,]/g, ""), period: r[4] })), null, 1));
' "$OUT" "$FROM" "$THRU"

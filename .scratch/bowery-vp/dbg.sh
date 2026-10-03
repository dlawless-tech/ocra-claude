#!/bin/bash
# Read one month's Cookshop VandyPay statement and save its PDF beside the run.
# usage: statement.sh <session> <MM> <YYYY>     (session logged in through vandypay-login.sh)
# Prints JSON: the summary figures at their statement sign, and the PDF's file name.
set -u
S="$1"; M="$2"; Y="$3"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
OUT=$(playwright-cli -s=$S eval "async () => {
const q = 'month=$M&year=$Y';
const html = await (await fetch('/store/index.php?tab=activity&content=index-store_statement&' + q, {credentials:'include'})).text();
const doc = new DOMParser().parseFromString(html, 'text/html');
doc.querySelectorAll('style,script').forEach(x => x.remove());
const t = doc.body.textContent.replace(/\s+/g, ' ');
const n = re => { const m = t.match(re); return m ? +m[1].replace(/[\$,]/g, '') : null; };
const store = (t.match(/Store (\d+): ([^,]+),/) || []);
const pdf = new Uint8Array(await (await fetch('/common/store_statement_pdf.php?s=' + store[1] + '&' + q, {credentials:'include'})).arrayBuffer());
let b = ''; for (const x of pdf) b += String.fromCharCode(x);
return JSON.stringify({
  storeId: store[1], store: store[2],
  sales: n(/Total Requested Sales Amount: (-?\\$[\d,.]+)/),
  refunds: n(/Total Requested Refund Amount: (-?\\$[\d,.]+)/),
  nonTransaction: n(/Non-Transaction Adjustments: (-?\\$[\d,.]+)/),
  transactionFees: n(/Transaction Fees: (-?\\$[\d,.]+)/),
  commissions: n(/Transaction Commissions: (-?\\$[\d,.]+)/),
  onlineOrderFees: n(/Online Order TX Fees: (-?\\$[\d,.]+)/),
  adjustmentsTotal: n(/Adjustments Total: (-?\\$[\d,.]+)/),
  net: n(/Net Total for Month: (-?\\$[\d,.]+)/),
  adjustments: (t.match(/Notes (.*?) Totals:/) || ['', ''])[1].trim(),
  pdf64: btoa(b)
});
}" 2>&1 | res)
echo "OUT=${OUT:0:600}"; J=$(node -e 'try{process.stdout.write(JSON.parse(process.argv[1]))}catch(e){}' "$OUT")
[ -n "$J" ] || { echo "FAIL: statement page answered $OUT"; exit 1; }
node -e '
const j = JSON.parse(process.argv[1]), f = j.store + "-" + j.storeId + "-" + process.argv[3] + "-" + process.argv[2] + ".pdf";
if (j.adjustmentsTotal === null || j.net === null) { console.log("FAIL: summary not found"); process.exit(1); }
require("fs").writeFileSync(f, Buffer.from(j.pdf64, "base64"));
delete j.pdf64; j.pdfFile = f; console.log(JSON.stringify(j, null, 1));
' "$J" "$M" "$Y"

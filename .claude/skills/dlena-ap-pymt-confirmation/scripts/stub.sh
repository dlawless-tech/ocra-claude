#!/bin/bash
# Export one payment's Check Stub Reprint as a PDF and check its amount.
# Usage: stub.sh <session> <payment id> <amount> <out.pdf>
set -u
S="$1"; ID="$2"; AMT="$3"; OUT="$4"
P="playwright-cli -s=$S"
res() { sed -n '/### Result/{n;p;}'; }
# User and SQLServer are the values R365 itself sends when the stub is opened from the form
U="https://unoatfifth.restaurant365.com/ReportServer/Pages/ReportViewer.aspx?/NA06/Check+Stub+Reprint&rs:Command=Render&rc:LinkTarget=_blank&Database=unoatfifth&User=755B3D48-DFB6-4126-B77A-6CADF2AC79B9&SQLServer=pro-sqlag-572.restaurant365.com&Payment=$ID"
$P tab-new "$U" >/dev/null 2>&1; sleep 15
T=$($P tab-list 2>&1 | grep -oP '^- \K\d+(?=: \(current\))')
trap '$P tab-close "$T" >/dev/null 2>&1' EXIT
TXT=$($P eval "() => document.body.innerText.replace(/\s+/g,' ')" 2>&1 | res)
GOT=$(echo "$TXT" | grep -oP 'Amount: \$\K[0-9,.]+' | head -1 | tr -d ,)
[ "$GOT" = "$AMT" ] || { echo "FAIL: stub amount '$GOT', want $AMT"; exit 1; }
$P eval "async () => { const b = await (await fetch(location.href.replace('rs:Command=Render','rs:Command=Render&rs:Format=PDF'), {credentials:'include'})).arrayBuffer(); let s=''; new Uint8Array(b).forEach(x=>s+=String.fromCharCode(x)); return btoa(s); }" > .stub.out 2>&1
node -e 'const s=require("fs").readFileSync(".stub.out","utf8");const m=s.match(/### Result\n"([^"]+)"/);if(!m){console.log("FAIL: no PDF");process.exit(1)}
const b=Buffer.from(m[1],"base64");if(b.slice(0,5).toString()!=="%PDF-"){console.log("FAIL: not a PDF");process.exit(1)}
require("fs").writeFileSync(process.argv[1],b);console.log("saved "+process.argv[1]+" ("+b.length+" bytes), stub amount "+process.argv[2])' "$OUT" "$AMT" || exit 1
rm -f .stub.out

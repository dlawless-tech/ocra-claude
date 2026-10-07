#!/bin/bash
# Build one vendor's ACH manual payment for every approved open invoice, on its own tab.
# Usage: new-payment.sh <session> "<vendor option text>" [approve]
# Without approve: stops with the form filled, applied and unsaved, for review.
# With approve: approves and prints "APPROVED <payment id> <amount>". The tab stays open either way.
# Exit 2: vendor has no approved open invoices (tab closed, nothing created).
set -u
S="$1"; V="$2"; GO="${3:-}"
K="$(cd "$(dirname "$0")" && pwd)"
P="playwright-cli -s=$S"
HOST=unoatfifth.restaurant365.com
ACCT='1122 - dLena Operating - 5002'
res() { sed -n '/### Result/{n;p;}'; }
unq() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s.trim())))}catch(e){process.stdout.write(s)}})'; }
snap() { $P snapshot --filename=.np.yml >/dev/null 2>&1; }
ref() { grep -F "$1" .np.yml | grep -oP '\[ref=\K[^\]]+' | head -1; }
grid() { $P eval "$(cat "$K/read-apply.js")" 2>&1 | res | unq; }

[ "$($P eval '() => location.hostname' 2>&1 | res | unq)" = "$HOST" ] || { echo "FAIL: logged out, run login.sh $S"; exit 1; }
$P tab-new "https://$HOST/react/APPaymentForm/00000000-0000-0000-0000-000000000000" >/dev/null 2>&1; sleep 12
$P resize 1600 1000 >/dev/null 2>&1   # narrow window renders the mobile layout
snap
grep -qF "combobox \"Checking Account\"" .np.yml || { echo "FAIL: payment form did not load"; exit 1; }

if ! grep -F 'combobox "Checking Account"' .np.yml | grep -qF "$ACCT"; then
  r=$(ref 'combobox "Checking Account"'); $P click $r >/dev/null 2>&1; $P fill $r 5002 >/dev/null 2>&1; sleep 3; snap
  o=$(ref "option \"$ACCT\""); [ -n "$o" ] || { echo "FAIL: no option $ACCT"; exit 1; }
  $P click $o >/dev/null 2>&1; sleep 2; snap
  grep -F 'combobox "Checking Account"' .np.yml | grep -qF "$ACCT" || { echo "FAIL: checking account did not take"; exit 1; }
fi

r=$(ref 'combobox "Vendor"'); $P click $r >/dev/null 2>&1; $P fill $r "${V:0:8}" >/dev/null 2>&1; sleep 3; snap
o=$(ref "option \"$V\""); [ -n "$o" ] || { echo "FAIL: no vendor option \"$V\""; grep -F 'option "' .np.yml; exit 1; }
$P click $o >/dev/null 2>&1; sleep 6; snap
r=$(ref 'textbox "Number"'); $P fill $r ACH >/dev/null 2>&1; $P press Tab >/dev/null 2>&1

G=$(grid)
SUM=$(node -e 'const g=JSON.parse(process.argv[1]);if(g.err){console.log("ERR "+g.err);process.exit()}
const m=g.pager.match(/of (\d+) Items/);if(m&&+m[1]!==g.rows.length){console.log("ERR pager "+g.pager);process.exit()}
for(const r of g.rows)console.error("  "+r.date+"  "+r.number.padEnd(16)+r.remaining.toFixed(2).padStart(10));
console.log((g.rows.reduce((a,r)=>a+Math.round(r.remaining*100),0)/100).toFixed(2)+" "+g.rows.length)' "$G")
case "$SUM" in ERR*) echo "FAIL: apply grid $SUM"; exit 1;; esac
AMT=${SUM% *}; N=${SUM#* }
if [ "$N" = 0 ]; then
  echo "NONE: $V has no approved open invoices"
  T=$($P tab-list 2>&1 | grep -oP '^- \K\d+(?=: \(current\))'); $P tab-close $T >/dev/null 2>&1; $P tab-select 0 >/dev/null 2>&1; exit 2
fi
echo "$V: $N approved invoices, $AMT"

snap; r=$(ref 'textbox "Amount"'); $P click $r >/dev/null 2>&1; $P fill $r "$AMT" >/dev/null 2>&1; $P press Tab >/dev/null 2>&1; sleep 2
snap; r=$(ref 'button "Auto-Apply"'); [ -n "$r" ] || { echo "FAIL: Auto-Apply disabled after amount $AMT"; exit 1; }
$P click $r >/dev/null 2>&1; sleep 3

# zero-to-zero: payment fully used and every invoice fully paid
CHK=$(node -e 'const g=JSON.parse(process.argv[1]);const bad=g.rows.filter(r=>!r.checked||Math.abs(r.remaining)>0.004);
const ap=g.rows.reduce((a,r)=>a+Math.round(r.applied*100),0)/100;
console.log(bad.length||!/^\$0\.00 remaining/.test(g.left)||ap.toFixed(2)!==process.argv[2]?"BAD "+g.left+" applied "+ap.toFixed(2)+" open "+bad.map(r=>r.number).join(","):"OK")' "$(grid)" "$AMT")
[ "$CHK" = OK ] || { echo "FAIL: $CHK (unsaved, close the tab)"; exit 1; }
echo "applied: $AMT, \$0.00 remaining, every invoice paid in full"

[ "$GO" = approve ] || { echo "READY: unsaved on the open tab; rerun with approve, or approve on the form"; exit 0; }
snap; r=$(grep -F 'button "Approve"' .np.yml | grep -oP '\[ref=\K[^\]]+' | head -1); $P click $r >/dev/null 2>&1; sleep 10; snap
grep -qF 'Approved' .np.yml || { echo "FAIL: status does not read Approved"; exit 1; }
ID=$($P eval '() => location.pathname.split("/").pop()' 2>&1 | res | unq)
[[ "$ID" =~ ^[0-9a-f-]{36}$ && "$ID" != 00000000-* ]] || { echo "FAIL: no payment id after approve ($ID)"; exit 1; }
rm -f .np.yml
echo "APPROVED $ID $AMT"

#!/bin/bash
# Set a Meat Credit Adj entry to <amount> and leave it Approved.
# usage: post-credit.sh <session> <TransactionId> <amount>
# An Approved entry is unapproved first. Lines: Dr 16000 Prepaid, Cr 52300 Meat.
# Prints OK with the amount read back after reload, or FAIL naming the step.
set -u
S="$1"; ID="$2"; AMT="$3"
HERE="$(dirname "$0")"
PAY="$HERE/../../danny-coops-payroll/scripts"
URL="https://dannyandcoops.restaurant365.com/#/form/JournalEntryForm/$ID"
res() { sed -n '/### Result/{n;p;}' | sed 's/^"//; s/"$//'; }
js() { playwright-cli -s=$S eval "$1" 2>&1 | res; }
fail() { echo "FAIL: $ID $1"; exit 1; }
GRID="const g=jQuery('[data-role=grid]').toArray().map(e=>jQuery(e).data('kendoGrid')).filter(Boolean)[0]"
shown() { js "() => { const li=document.getElementById('$1'); return !!(li && li.offsetParent); }"; }
body() { N=$(playwright-cli -s=$S requests 2>&1 | grep "$1" | tail -1 | grep -oE '^[0-9]+'); [ -n "$N" ] && playwright-cli -s=$S response-body "$N" 2>&1 | grep -m1 '^[[{"]'; }
# 52300 credit and 16000 debit, in cents, as "c52300 d16000 lines"
lines() { js "() => { $GRID; if(!g) return 'nogrid'; const c=x=>Math.round(Number(x||0)*100); const d=g.dataSource.data(); const m=d.find(r=>/^52300 /.test(r.glAccount)), p=d.find(r=>/^16000 /.test(r.glAccount)); return m&&p ? [c(m.credit)-c(m.debit), c(p.debit)-c(p.credit), d.length].join(' ') : 'missing'; }"; }
open() {
  playwright-cli -s=$S goto "$URL" >/dev/null 2>&1
  for i in $(seq 1 10); do sleep 4; L=$(lines); [ "$L" != nogrid ] && [ -n "$L" ] && return; done
  fail "grid did not load"
}
WANT=$(node -e 'console.log(Math.round(Number(process.argv[1])*100))' "$AMT")

open
[ "$(shown Unapprove)" = true ] && {
  playwright-cli -s=$S click '#Unapprove > a' >/dev/null 2>&1; sleep 2
  playwright-cli -s=$S click 'li[data-testid=unapproveMenuItem]' >/dev/null 2>&1; sleep 8
  body 'UnApprove' | grep -q 'unapproved successfully' || fail "unapprove not confirmed"
  open
}
[ "$(shown Approve)" = true ] || fail "entry not unapproved"

R=$(js "() => { $GRID; const d=g.dataSource.data(); const a=$AMT; let n=0;
  d.forEach(r=>{ if(/^52300 /.test(r.glAccount)){ r.set('credit',a); r.set('debit',0); n++; } if(/^16000 /.test(r.glAccount)){ r.set('debit',a); r.set('credit',0); n++; } });
  return n; }")
[ "$R" = 2 ] || fail "expected one 52300 and one 16000 line, set $R"
bash "$PAY/save.sh" "$S" | grep -q "^\[\[\"1\"" || fail "save rejected"

open
[ "$(lines)" = "$WANT $WANT 2" ] || fail "read back $(lines), want $WANT $WANT 2"
playwright-cli -s=$S click '#Approve > a' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click 'li[data-testid=approveAndCloseMenuItem]' >/dev/null 2>&1; sleep 10
# Approve and Close can take the request log with the tab; reopen to confirm
body 'Transaction/Approve' | grep -q 'Successfully Approved' || {
  open; [ "$(shown Unapprove)" = true ] || fail "approve not confirmed"; }
echo "OK: $ID $AMT"

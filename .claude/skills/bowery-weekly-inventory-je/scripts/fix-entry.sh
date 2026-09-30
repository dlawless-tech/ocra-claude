#!/bin/bash
# Correct an existing Inventory entry to its lines.json amounts: unapprove, set the lines,
# save, swap attachments, approve and close, then check the server copy.
#
# Usage: fix-entry.sh <session> <store> <TransactionId> [file to attach] [attachment name to delete]
# Prints MATCH, or FAIL naming the step.
set -u
S="$1"; N="$2"; ID="$3"; ATT="${4:-}"; DEL="${5:-}"; HERE="$(cd "$(dirname "$0")" && pwd)"; SK="$HERE/../.."
res() { sed -n '/### Result/{n;p;}' | sed 's/^"//; s/"$//'; }
js() { playwright-cli -s=$S eval "$1" 2>&1 | res; }
fail() { echo "FAIL: $N $ID $1"; exit 1; }
shown() { js "() => { const li=document.getElementById('$1'); return !!(li && li.offsetParent); }"; }
body() { R=$(playwright-cli -s=$S requests 2>&1 | grep "$1" | tail -1 | grep -oE '^[0-9]+'); [ -n "$R" ] && playwright-cli -s=$S response-body "$R" 2>&1 | grep -m1 '^[[{"]'; }
atts() { js "() => Array.from(document.querySelectorAll('.journal-entry-form .aws-uploader-file-list-item')).map(x=>x.innerText.trim()).join(' | ')"; }
open() { playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/react/home" >/dev/null 2>&1; sleep 3; playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 22; }

playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
open
[ "$(shown Unapprove)" = true ] && {
  playwright-cli -s=$S click '#Unapprove > a' >/dev/null 2>&1; sleep 2
  playwright-cli -s=$S click 'li[data-testid=unapproveMenuItem]' >/dev/null 2>&1; sleep 8
  body 'UnApprove' | grep -qi 'unapproved successfully' || fail "unapprove not confirmed"
  open; }
[ "$(shown Approve)" = true ] || fail "entry not unapproved"
node "$HERE/set-lines.js" lines.json "$N" > "set_$N.js" || fail "set-lines"
R=$(js "$(cat set_$N.js)"); echo "$R"; case "$R" in set\ 8*) : ;; *) fail "$R";; esac
bash "$SK/danny-coops-payroll/scripts/save.sh" $S | grep -q '^\[\["1"' || fail "save rejected"

if [ -n "$DEL" ]; then
  C=$(js "() => { const it=Array.from(document.querySelectorAll('.journal-entry-form .aws-uploader-file-list-item')).find(x=>x.innerText.trim()===\"$DEL\"); if(!it) return 'none'; it.querySelector('button.delete-file').click(); return 'clicked'; }")
  [ "$C" = clicked ] || fail "no attachment named $DEL"
  sleep 3
  C=$(js "() => { const b=Array.from(document.querySelectorAll('.k-window button, .modal button, md-dialog button')).filter(x=>x.offsetParent&&/^(yes|ok|delete|confirm)$/i.test(x.innerText.trim())); if(!b.length) return 'no confirm button'; b[0].click(); return 'confirmed'; }")
  [ "$C" = confirmed ] || fail "$C"
  sleep 5
  atts | grep -qF "$DEL" && fail "$DEL still listed"
fi
[ -n "$ATT" ] && { bash "$SK/danny-coops-payroll/scripts/attach.sh" $S "$ATT" || fail "attach"; }

# approve last: an upload onto an approved entry has come back Unapproved
playwright-cli -s=$S click '#Approve > a' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click 'li[data-testid=approveAndCloseMenuItem]' >/dev/null 2>&1; sleep 12
body 'Transaction/Approve' | grep -qi 'Successfully Approved' || fail "approve not confirmed"
bash "$HERE/read-entry.sh" $S "$ID" > "readback_$N.json"
node "$HERE/check-entry.js" lines.json "$N" "readback_$N.json" ${ATT:+"$(basename "$ATT")"} || exit 1

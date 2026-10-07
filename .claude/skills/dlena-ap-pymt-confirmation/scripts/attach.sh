#!/bin/bash
# Attach a file to the open AP Payment tab for <payment id>, then reload and check it stuck.
# Usage: attach.sh <session> <payment id> <file>
# The file's own name becomes the attachment name; pass an absolute path without an apostrophe.
set -u
S="$1"; ID="$2"; F="$3"
P="playwright-cli -s=$S"
T=$($P tab-list 2>&1 | grep -F "$ID" | grep -oP '^- \K\d+' | head -1)
[ -n "$T" ] || { echo "FAIL: no open tab for payment $ID"; exit 1; }
$P tab-select "$T" >/dev/null 2>&1
snap() { $P snapshot --filename=.at.yml >/dev/null 2>&1; }
count() { grep -oP 'tab "?Attachments - \K\d+|\]: Attachments - \K\d+' .at.yml | head -1; }
snap; N0=$(count)
r=$(grep -E 'tab "Attachments - |\]: Attachments - ' .at.yml | grep -oP '\[ref=\K[^\]]+' | head -1); $P click $r >/dev/null 2>&1; sleep 3
W=$(cygpath -m "$F" 2>/dev/null || echo "$F")
$P run-code "async page => { await page.locator('input[type=file]').first().setInputFiles('$W'); }" 2>&1 | grep -q '### Error' && { echo "FAIL: setInputFiles"; exit 1; }
sleep 6
$P reload >/dev/null 2>&1; sleep 12; snap
N1=$(count)
[ "${N1:-0}" -gt "${N0:-0}" ] || { echo "FAIL: attachments $N0 -> $N1 after reload"; exit 1; }
rm -f .at.yml
echo "attached $(basename "$F") (attachments $N0 -> $N1)"

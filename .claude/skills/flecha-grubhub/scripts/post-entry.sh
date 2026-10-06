#!/bin/bash
# Duplicate a store's prior GrubHub entry and hand the copy to fill-entry.sh.
# usage: post-entry.sh <session> <source TransactionId> <M/D/YYYY> <fee> [comment]
# Prints "OK <new id> <fee>" or "FAIL: ...". The copy exists on the server from the Duplicate click.
set -u
S=$1; SRC=$2; DT=$3; FEE=$4; CMT=${5:-}; HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP=https://flecha.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "FAIL: $*"; exit 1; }
ntabs() { playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:'; }
body() {  # body <url fragment>: response body of the latest matching request
  local N=$(playwright-cli -s=$S requests 2>&1 | grep "$1" | tail -1 | grep -oE '^[^0-9]*[0-9]+' | grep -oE '[0-9]+$')
  [ -n "$N" ] && playwright-cli -s=$S response-body "$N" 2>&1 | res; }

playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S goto "$APP/#/form/JournalEntryForm/$SRC" >/dev/null 2>&1; sleep 14
T=$(ntabs)
playwright-cli -s=$S hover '#Action > a' >/dev/null 2>&1; sleep 1
R=$(playwright-cli -s=$S eval "() => { const a=Array.from(document.getElementById('Action').querySelectorAll('ul li a, ul li button')).find(x=>x.innerText.trim()==='Duplicate'); if(!a) return 'nodup'; a.click(); return 'ok'; }" 2>&1 | res)
case "$R" in *ok*) : ;; *) die "Duplicate menu item: $R";; esac
sleep 4
# "transaction only" prompt when the source has attachments
playwright-cli -s=$S eval "() => { const b=Array.from(document.querySelectorAll('button')).find(x=>/^No, transaction only$/i.test(x.innerText.trim())); if(b){b.click(); return 'no';} return 'none'; }" >/dev/null 2>&1
for i in $(seq 1 10); do sleep 3; [ "$(ntabs)" -gt "$T" ] && break; done
[ "$(ntabs)" -gt "$T" ] || die "no duplicate tab"
playwright-cli -s=$S tab-select $T >/dev/null 2>&1; sleep 6

playwright-cli -s=$S fill '#journalEntryDate' "$DT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill '#journalEntryNumber' "GrubHub" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 2

NEW=$(playwright-cli -s=$S eval "() => location.hash.split('/').pop()" 2>&1 | res | tr -d '"')
echo "copy $NEW" >&2
bash "$HERE/fill-entry.sh" $S "$NEW" "$DT" "$FEE" "$CMT"; RC=$?
playwright-cli -s=$S tab-close >/dev/null 2>&1; playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
exit $RC

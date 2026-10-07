#!/bin/bash
# Make a new GrubHub entry from a store's template and post it: Action > Duplicate, date, fill, save, verify, approve.
# For the month-end part of a period, which R365 never pre-creates.
#
# Usage: ENTRY_DATE=9/30/2026 duplicate-post.sh <session> <loc> <work.json>
#   work.json from build-work.js; the record's id is the SOURCE entry to copy (the store's Saturday template).
# Prints "<loc> DONE <new id> <total>". A failure after Duplicate leaves an NJ-numbered copy; delete it.
set -u
S=$1; LOC=$2; WORK=$3; DT="${ENTRY_DATE:?}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$HERE/lib.sh"
REC=$(node -e 'const w=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.loc===process.argv[2]);process.stdout.write(w?w.id+" "+w.tot.toFixed(2):"")' "$WORK" "$LOC")
[ -n "$REC" ] || die "not in work file"
SRC=${REC% *}; TOT=${REC#* }

while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$SRC" >/dev/null 2>&1; sleep 13
playwright-cli -s=$S click '#Action > a' >/dev/null 2>&1; sleep 1
R=$(playwright-cli -s=$S eval "() => { const a=Array.from(document.querySelectorAll('#Action li')).find(x=>x.innerText.trim()==='Duplicate'); if(!a) return 'nodup'; a.querySelector('a').click(); return 'ok'; }" 2>&1 | res)
case "$R" in *ok*) : ;; *) die "duplicate: $R";; esac
sleep 13
# the copy opens in a second tab, already saved as NJ..., dated today
[ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -ge 2 ] || die "no duplicate tab"
playwright-cli -s=$S tab-select 1 >/dev/null 2>&1; sleep 4
NEWID=$(playwright-cli -s=$S eval "() => location.hash.split('/').pop()" 2>&1 | res | tr -d '"')
echo "$LOC copy $NEWID"

playwright-cli -s=$S fill 'input[name="journalEntryDate"]' "$DT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill 'input[name="journalEntryNumber"]' "GrubHub" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
R=$(playwright-cli -s=$S eval "$(node "$HERE/set-lines.js" "$WORK" "$LOC")" 2>&1 | res | sed 's/\\"/"/g')
case "$R" in *'"miss":[]'*"\"dr\":\"$TOT\",\"cr\":\"$TOT\""*) : ;; *) die "set $R want $TOT";; esac

bash "$HERE/ribbon-menu.sh" $S Save "Save" >/dev/null 2>&1; sleep 12
N=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE "^[0-9]+")
B=$(playwright-cli -s=$S response-body $N 2>&1 | grep -E '^\[\[')
case "$B" in *"\"1\",\"$NEWID\""*) : ;; *) die "save body: $B";; esac
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14
readback $S "$WORK" "$LOC" "$DT" || die "reload readback mismatch"
approve $S "$NEWID" || die "approve"
echo "$LOC DONE $NEWID $TOT"

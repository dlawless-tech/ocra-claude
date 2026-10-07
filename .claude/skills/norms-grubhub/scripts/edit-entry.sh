#!/bin/bash
# Fill a GrubHub template that arrived Approved at 0.00, keeping it Approved: real click on Edit, set the lines, Edit Complete.
#
# Usage: ENTRY_DATE=10/3/2026 edit-entry.sh <session> <loc> <work.json>
#   work.json from build-work.js; the record's id is the template itself.
# Skips an entry that already carries amounts unless FORCE=1.
set -u
S=$1; LOC=$2; WORK=$3; DT="${ENTRY_DATE:?}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; . "$HERE/lib.sh"
REC=$(node -e 'const w=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.loc===process.argv[2]);process.stdout.write(w?w.id+" "+w.tot.toFixed(2):"")' "$WORK" "$LOC")
[ -n "$REC" ] || die "not in work file"
ID=${REC% *}; TOT=${REC#* }

playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 14
B=$(playwright-cli -s=$S eval "$(cat "$HERE/read-model.js")" 2>&1 | res | sed 's/\\"/"/g; s/^"//; s/"$//')
echo "$LOC before $B"
case "$B" in *"\"date\":\"$DT\""*) : ;; *) die "wrong date or not loaded";; esac
case "$B" in *" - $LOC\"]"*) : ;; *) die "wrong location";; esac
case "$B" in *'"st":"Approved"'*) : ;; *) die "not Approved; use post-entry.sh";; esac
EMPTY=$(node -e 'const v=JSON.parse(process.argv[1]);process.stdout.write(v.rows.every(r=>!r[1]&&!r[2])?"1":"0")' "$B")
[ "$EMPTY" = 1 ] || [ "${FORCE:-0}" = 1 ] || { echo "$LOC SKIP: already carries amounts"; exit 0; }

playwright-cli -s=$S click 'button:text-is("Edit")' >/dev/null 2>&1 || die "no Edit button"
sleep 3
R=$(playwright-cli -s=$S eval "$(node "$HERE/set-lines.js" "$WORK" "$LOC")" 2>&1 | res | sed 's/\\"/"/g')
case "$R" in *'"miss":[]'*"\"dr\":\"$TOT\",\"cr\":\"$TOT\""*) : ;; *) die "set $R want $TOT";; esac
playwright-cli -s=$S click 'button:text-is("Edit Complete")' >/dev/null 2>&1 || die "no Edit Complete button"
sleep 10
N=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE "^[0-9]+")
SB=$( [ -n "$N" ] && playwright-cli -s=$S response-body $N 2>&1 | grep -E '^\[\[')
case "$SB" in *"\"1\",\"$ID\""*) : ;; *) die "save body: $SB";; esac
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14
readback $S "$WORK" "$LOC" "$DT" || die "reload readback mismatch"
A=$(playwright-cli -s=$S eval "() => (document.body.innerText.match(/Unapproved|Approved/)||['?'])[0]" 2>&1 | res | tr -d '"')
[ "$A" = Approved ] || die "status $A after save"
echo "$LOC DONE $ID $TOT"

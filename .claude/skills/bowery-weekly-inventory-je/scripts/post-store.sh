#!/bin/bash
# Post one store's week: duplicate its prior Inventory entry, date it, set the lines,
# save, attach the export, and check the server copy. Leaves it Unapproved.
#
# Usage: post-store.sh <session> <store> <prior TransactionId>
# Needs lines.json and att/<store>/MM.DD.YY.xlsx in the working directory.
# Prints the new id and MATCH, or FAIL naming the step.
set -u
S="$1"; N="$2"; SRC="$3"; HERE="$(cd "$(dirname "$0")" && pwd)"; SK="$HERE/../.."
fail() { echo "FAIL: $N $1"; exit 1; }
read -r D F < <(node -e 'const [y,m,d]=require("./lines.json").weekEnd.split("-");console.log(+m+"/"+ +d+"/"+y, m+"."+d+"."+y.slice(2)+".xlsx")')
[ -s "att/$N/$F" ] || fail "no att/$N/$F"

playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
ID=$(bash "$SK/bowery-weekly-cash-log/scripts/duplicate.sh" $S "$SRC" "$D" Inventory); echo "$ID" | grep -qE '^[0-9a-f-]{36}$' || fail "duplicate: $ID"
echo "new $ID"
node "$HERE/set-lines.js" lines.json "$N" > "set_$N.js" || fail "set-lines"
R=$(playwright-cli -s=$S eval "$(cat set_$N.js)" 2>&1 | sed -n '/### Result/{n;p;}' | tr -d '"'); echo "$R"
case "$R" in set\ 8*) : ;; *) fail "$R";; esac
bash "$SK/danny-coops-payroll/scripts/save.sh" $S | grep -q '^\[\["1"' || fail "save rejected"
bash "$SK/danny-coops-payroll/scripts/attach.sh" $S "att/$N/$F" || fail "attach"
bash "$SK/danny-coops-payroll/scripts/save.sh" $S | grep -q '^\[\["1"' || fail "save after attach rejected"

# the copy opened in its own tab; close it so tab 0 stays the R365 home
T=$(playwright-cli -s=$S tab-list 2>&1 | grep -E '^- [0-9]+: \(current\)' | grep -oE '[0-9]+' | head -1)
[ -n "$T" ] && [ "$T" != 0 ] && playwright-cli -s=$S tab-close $T >/dev/null 2>&1
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
bash "$HERE/read-entry.sh" $S "$ID" > "readback_$N.json"
node "$HERE/check-entry.js" lines.json "$N" "readback_$N.json" "$F" || exit 1

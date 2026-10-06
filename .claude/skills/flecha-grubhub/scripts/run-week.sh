#!/bin/bash
# Weekly Flecha GrubHub run: true up entries already posted, estimate new ones.
# usage: run-week.sh <session> <gl.txt> <report end M/D/YYYY> <ids.txt> <entry date>...
# ids.txt rows: <entry date>|<location>|<TransactionId>. An entry date with ids is trued up
# in place to its actual; one without is duplicated from the store's latest id and appended.
set -u
S=$1; GL=$2; END=$3; IDS=$4; shift 4
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LINES=$(mktemp)
node "$HERE/build.js" "$GL" "$END" "$@" > "$LINES" || exit 1
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).forEach(r=>console.log([r.entry,r.location,r.basis,r.fee,r.flag||"",r.comment].join("\t")))' "$LINES" |
while IFS=$'\t' read DT LOC BASIS FEE FLAG CMT; do
  [ -n "$FLAG" ] && { echo "SKIP $DT $LOC: $FLAG"; continue; }
  ID=$(grep -F "$DT|$LOC|" "$IDS" | tail -1 | cut -d'|' -f3)
  if [ -n "$ID" ]; then
    [ "$BASIS" = actual ] || { echo "SKIP $DT $LOC: deposit not in yet, stays at its estimate"; continue; }
    echo "TRUEUP $DT $LOC $(bash "$HERE/fill-entry.sh" $S "$ID" "$DT" "$FEE" "$CMT" 2>&1 | tail -1)"
    playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
  else
    SRC=$(grep -F "|$LOC|" "$IDS" | tail -1 | cut -d'|' -f3)
    [ -n "$SRC" ] || { echo "FAIL $DT $LOC: no source entry in $IDS"; continue; }
    R=$(bash "$HERE/post-entry.sh" $S "$SRC" "$DT" "$FEE" "$CMT" 2>&1 | tail -1)
    echo "$BASIS $DT $LOC $R"
    case "$R" in OK*) echo "$DT|$LOC|$(echo "$R" | cut -d' ' -f2)" >> "$IDS";; esac
  fi
done
rm -f "$LINES"

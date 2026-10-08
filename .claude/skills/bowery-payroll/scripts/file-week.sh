#!/bin/bash
# Move the week's dropped files into Payroll\Completed\WE <MM.DD.YY>, then make next week's folder there.
# usage: file-week.sh <week ending M/D/YYYY> <manifest> [extra file ...]
# manifest: one original path per line, the files the run was built from. Extras (the import CSV) are copied in.
set -u
WE="$1"; MAN="$2"; shift 2
P="/c/Users/trici/OCRA/Bowery Group - General/Payroll"
D="$P/Completed/WE $(date -d "$WE" +%m.%d.%y)" || exit 1
N="$P/Completed/WE $(date -d "$WE + 7 days" +%m.%d.%y)"
[ -f "$MAN" ] || { echo "FAIL: no manifest $MAN"; exit 1; }
mkdir -p "$D"
rc=0
while IFS= read -r f; do
  f="${f%$'\r'}"; [ -n "$f" ] || continue
  f="$(cygpath -u "$f")"
  b="$(basename "$f")"
  if [ -e "$D/$b" ]; then [ -e "$f" ] && { echo "FAIL: $D/$b already exists"; rc=1; } || echo "already filed $b"; continue; fi
  [ -f "$f" ] || { echo "FAIL: missing $f"; rc=1; continue; }
  mv "$f" "$D/" && echo "filed $b" || rc=1
done < "$MAN"
for x in "$@"; do cp -f "$x" "$D/" && echo "copied $(basename "$x")" || rc=1; done
[ $rc -eq 0 ] || { echo "FAIL: not every file filed; next week's folder not made"; exit 1; }
mkdir -p "$N" && echo "next week folder $N"

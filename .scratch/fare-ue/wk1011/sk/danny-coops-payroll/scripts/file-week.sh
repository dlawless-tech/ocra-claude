#!/bin/bash
# Move the week's journal into the Payroll folder's Completed.
# usage: file-week.sh <original file>
set -u
F="$1"
D="/c/Users/trici/OCRA/Danny and Coops - General/Payroll/Completed"
[ -f "$F" ] || { echo "FAIL: no $F"; exit 1; }
mkdir -p "$D"
[ -e "$D/$(basename "$F")" ] && { echo "FAIL: $D/$(basename "$F") already exists"; exit 1; }
mv "$F" "$D/" && echo "filed $D/$(basename "$F")"

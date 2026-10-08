#!/bin/bash
# Move the week's workbook into Completed, keeping its name.
# usage: file-week.sh <original workbook>
set -u
F="$1"
D="/c/Users/trici/OCRA/Bowery Group - General/Journal Entries/Weekly Labor Allocations/Completed"
T="$D/$(basename "$F")"
[ -f "$F" ] || { echo "FAIL: no $F"; exit 1; }
[ -e "$T" ] && { echo "FAIL: $T already exists"; exit 1; }
mv "$F" "$T" && [ ! -e "$F" ] && echo "filed $T"

#!/bin/bash
# Move the week's tracker into Completed under the week's name.
# usage: file-week.sh <original tracker> <M.D.YY>
set -u
F="$1"; W="$2"
D="/c/Users/trici/OCRA/Bowery Group - General/Journal Entries/Weekly Purchase Transfers/Completed"
T="$D/GL_Reallocation_Tracker $W.xlsx"
[ -f "$F" ] || { echo "FAIL: no $F"; exit 1; }
[ -e "$T" ] && { echo "FAIL: $T already exists"; exit 1; }
mv "$F" "$T" && [ ! -e "$F" ] && echo "filed $T"

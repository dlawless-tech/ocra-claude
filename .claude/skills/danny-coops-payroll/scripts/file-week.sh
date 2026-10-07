#!/bin/bash
# Move the week's journal into Downloads\Completed\we <M.D>, creating the folder.
# usage: file-week.sh <original file> <period end M/D/YYYY>
set -u
F="$1"; WE="$2"
D="/c/Users/trici/OCRA/TML's Files - General/Downloads/Completed/we $(echo "$WE" | cut -d/ -f1-2 | tr / .)"
[ -f "$F" ] || { echo "FAIL: no $F"; exit 1; }
mkdir -p "$D"
[ -e "$D/$(basename "$F")" ] && { echo "FAIL: $D/$(basename "$F") already exists"; exit 1; }
mv "$F" "$D/" && echo "filed $D/$(basename "$F")"

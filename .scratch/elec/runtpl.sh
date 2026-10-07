#!/bin/bash
while IFS=$'\t' read -r L I N; do bash tpl.sh e5 "$L" "$I" "$N" < /dev/null | grep '|'; done < tpl.tsv > log-tpl.txt 2>&1
echo DONE >> log-tpl.txt

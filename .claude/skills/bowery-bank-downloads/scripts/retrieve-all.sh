#!/bin/bash
# Retrieve every account on the Bank Activity dropdown, in list order.
# Usage: retrieve-all.sh <session> <start M/D/YYYY> <end M/D/YYYY> [first index]
# Appends one line per account to retrieve.log; stops on the first FAIL.
set -u
S="$1"; START="$2"; END="$3"; FROM="${4:-1}"
ONE="$(dirname "$0")/retrieve-account.sh"
for n in $(seq "$FROM" 99); do
  L=$(bash "$ONE" "$S" "$n" "$START" "$END" 2>&1)
  echo "$n $L" | tee -a retrieve.log
  case "$L" in END*) exit 0;; FAIL*) exit 1;; esac
done

#!/bin/bash
# Close this skill's browsers, and only those; other FARE runs share the machine.
# usage: close.sh   (run from the run's working directory)
set -u
for S in ${UBER_SESSION:-fue-uber} ${R365_SESSION:-fue-r365}; do playwright-cli -s=$S close >/dev/null 2>&1; done
L=$(playwright-cli list 2>&1 | grep -E "^- (${UBER_SESSION:-fue-uber}|${R365_SESSION:-fue-r365}):" -A1 | grep -c 'status: open')
[ "$L" = 0 ] && echo "closed" || { echo "FAIL: $L session(s) still open"; exit 1; }

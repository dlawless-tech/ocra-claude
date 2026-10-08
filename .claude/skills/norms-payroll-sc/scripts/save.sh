#!/bin/bash
# Save the open entry through the ribbon and print the server's reply.
# usage: save.sh <session>
# A committed save reads [["1","<id>"," "],["1",""]]; a rejected one ["15","..."].
set -u
S="$1"
B=$(playwright-cli -s=$S requests 2>&1 | grep -c SaveTransaction)
playwright-cli -s=$S hover '#Save > a' >/dev/null 2>&1
playwright-cli -s=$S eval "() => { const li=document.querySelector('#Save li[data-testid=\"saveMenuItem\"]'); const sc=window.angular.element(li).scope(); sc.\$apply(() => sc.subMenu.handler()); return sc.subMenu.title; }" >/dev/null 2>&1
sleep 12
[ "$(playwright-cli -s=$S requests 2>&1 | grep -c SaveTransaction)" -gt "$B" ] || { echo "FAIL: no new SaveTransaction request"; exit 1; }
N=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE '^[0-9]+')
playwright-cli -s=$S response-body "$N" 2>&1 | grep '^\[\['

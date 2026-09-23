#!/bin/bash
# Save the open entry through the ribbon and print the server's reply.
# usage: save.sh <session>
# A committed save reads [["1","<id>"," "],["1",""]]; a rejected one ["15","..."].
set -u
S="$1"
playwright-cli -s=$S hover '#Save > a' >/dev/null 2>&1
playwright-cli -s=$S eval "() => { const li=document.getElementById('Save'); const items=Array.from(li.querySelectorAll('ul li a, ul li button')).filter(a=>a.innerText.trim()==='Save'); items[items.length-1].click(); return 'clicked'; }" >/dev/null 2>&1
sleep 10
N=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE '^[0-9]+')
[ -n "$N" ] || { echo "FAIL: no SaveTransaction request"; exit 1; }
playwright-cli -s=$S response-body "$N" 2>&1 | grep '^\[\['

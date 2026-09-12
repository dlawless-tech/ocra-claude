#!/bin/bash
set -u
S=water2
LOG=.scratch/water/memorize.log
: > $LOG
res() { sed -n '/### Result/,/### Ran/p' | sed '1d;$d'; }

while IFS=$'\t' read -r SHORT FULL; do
  [ -z "${SHORT:-}" ] && continue
  playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
  sleep 1
  sed "s|__T__|$SHORT|" .scratch/water/openje.js > .scratch/water/_j.js
  O=$(playwright-cli -s=$S eval "$(cat .scratch/water/_j.js)" 2>&1 | res)
  case "$O" in *opened*) ;; *) echo "$FULL | OPEN FAILED: $O" >> $LOG; continue;; esac
  sleep 7
  playwright-cli -s=$S tab-select 1 >/dev/null 2>&1
  sleep 3

  # guard: confirm we are on the right entry
  H=$(playwright-cli -s=$S eval "() => JSON.stringify({n:document.querySelector('[name=\"journalEntryNumber\"]').value, d:document.querySelector('[name=\"journalEntryDate\"]').value, l:document.querySelector('[name=\"journalEntryLocation_input\"]').value})" 2>&1 | res)
  case "$H" in *"Accrued Water"*"$FULL"*) ;; *) echo "$FULL | WRONG ENTRY: $H" >> $LOG; playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; continue;; esac
  case "$H" in *"9/12/2026"*) ;; *) echo "$FULL | WRONG DATE: $H" >> $LOG; playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; continue;; esac

  playwright-cli -s=$S hover '#Action > a' >/dev/null 2>&1
  sleep 2
  playwright-cli -s=$S eval "() => { const li=document.getElementById('Action'); const items=Array.from(li.querySelectorAll('ul li a, ul li button, ul li')).filter(a=>a.innerText.trim()==='Memorize'); items[items.length-1].click(); return 'ok'; }" >/dev/null 2>&1
  sleep 5

  playwright-cli -s=$S eval "() => { const d=document.getElementById('memorizeAutoRecurrence'); d.querySelector('.k-select, .k-i-arrow-s').click(); return 'ok'; }" >/dev/null 2>&1
  sleep 3
  playwright-cli -s=$S eval "() => { const lis=Array.from(document.querySelectorAll('ul.k-list li')).filter(e=>e.offsetParent && e.innerText.trim()==='Weekly'); lis[0].click(); return 'ok'; }" >/dev/null 2>&1
  sleep 2
  playwright-cli -s=$S fill 'input[name="name"]' "$FULL:Accrued Water" >/dev/null 2>&1
  sleep 1

  V=$(playwright-cli -s=$S eval "() => JSON.stringify({name: document.querySelector('input[name=\"name\"]').value, rec: document.querySelector('#memorizeAutoRecurrence input.k-input').value})" 2>&1 | res)
  EXP="{\\\"name\\\":\\\"$FULL:Accrued Water\\\",\\\"rec\\\":\\\"Weekly\\\"}"
  case "$V" in *"$FULL:Accrued Water"*Weekly*) ;; *) echo "$FULL | DIALOG BAD: $V" >> $LOG; playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; continue;; esac

  playwright-cli -s=$S eval "() => { const b=Array.from(document.querySelectorAll('button, a')).filter(e=>e.offsetParent && e.innerText.trim()==='Memorize'); b[b.length-1].click(); return 'ok'; }" >/dev/null 2>&1
  sleep 6

  playwright-cli -s=$S hover '#Save > a' >/dev/null 2>&1
  sleep 2
  playwright-cli -s=$S eval "() => { const li=document.getElementById('Save'); const items=Array.from(li.querySelectorAll('ul li a, ul li button')).filter(a=>a.innerText.trim()==='Save and Close'); items[items.length-1].click(); return 'ok'; }" >/dev/null 2>&1
  sleep 9

  T=$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- 1:')
  if [ "$T" != "0" ]; then playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; fi
  echo "$FULL | $V | memorize+save&close sent" >> $LOG
  sleep 1
done < .scratch/water/memorize.tsv
echo DONE >> $LOG

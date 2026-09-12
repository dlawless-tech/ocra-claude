#!/bin/bash
set -u
S=water
res() { sed -n '/### Result/,/### Ran/p' | sed '1d;$d'; }

while IFS=$'\t' read -r LOC LID AMT; do
  [ -z "${LOC:-}" ] && continue
  echo "=== $LOC  $AMT"

  playwright-cli -s=$S tab-select 1 >/dev/null 2>&1
  playwright-cli -s=$S hover '#Action > a' >/dev/null 2>&1
  sleep 2
  playwright-cli -s=$S eval "() => { const li=document.getElementById('Action'); const items=Array.from(li.querySelectorAll('ul li a, ul li button, ul li')).filter(a=>a.innerText.trim()==='Duplicate'); items[items.length-1].click(); return 'dup'; }" >/dev/null 2>&1
  sleep 7

  playwright-cli -s=$S tab-select 2 >/dev/null 2>&1
  sleep 3

  sed -e "s|__LOC__|$LOC|" -e "s|__LID__|$LID|" -e "s|__AMT__|$AMT|" .scratch/water/apply.js.tpl > .scratch/water/_apply.js
  OUT=$(playwright-cli -s=$S eval "$(cat .scratch/water/_apply.js)" 2>&1 | res)
  case "$OUT" in *FAIL*|"") echo "  APPLY FAILED: $OUT"; playwright-cli -s=$S tab-close 2 >/dev/null 2>&1; continue;; esac

  playwright-cli -s=$S fill 'input[name="journalEntryNumber"]' 'Accrued Water' >/dev/null 2>&1
  playwright-cli -s=$S press Tab >/dev/null 2>&1
  sleep 1

  playwright-cli -s=$S hover '#Save > a' >/dev/null 2>&1
  sleep 2
  playwright-cli -s=$S eval "() => { const li=document.getElementById('Save'); const items=Array.from(li.querySelectorAll('ul li a, ul li button')).filter(a=>a.innerText.trim()==='Save'); items[items.length-1].click(); return 'saved'; }" >/dev/null 2>&1
  sleep 9

  V=$(playwright-cli -s=$S eval "$(cat .scratch/water/verify.js)" 2>&1 | res)
  echo "  $V"
  playwright-cli -s=$S tab-close 2 >/dev/null 2>&1
  sleep 2
done < .scratch/water/stores.tsv

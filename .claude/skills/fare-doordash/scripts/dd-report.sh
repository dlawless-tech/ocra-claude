#!/bin/bash
# Request the all-stores financial report for one payout date, download it, unzip it.
# usage: dd-report.sh <session> <payout date M/D/YYYY> <out dir>
# Run from the session's working directory: downloads land in ./.playwright-cli/.
set -u
S="$1"; PD="$2"; OUT="$3"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '"'; }
ev() { playwright-cli -s=$S eval "$1" 2>&1 | res; }
snap() { playwright-cli -s=$S snapshot > snap.dd.txt 2>&1; }
ref() { grep -E "$1" snap.dd.txt | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2; }
# chat panel and intro dialogs swallow real clicks
clear_overlays() { snap; for p in 'button "Collapse Chat"' 'button "Close All your DoorDash' 'button "Maybe later"'; do
  R=$(ref "$p"); [ -n "$R" ] && { playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 2; }; done; snap; }

ev "() => { const b=[...document.querySelectorAll('button')].find(e=>e.innerText.trim()==='Financials'); if(!b) return 'none'; b.click(); return 'ok'; }" | grep -q ok || { echo "FAIL: no Financials nav"; exit 1; }
sleep 10; clear_overlays
for i in 1 2 3 4 5 6; do R=$(ref 'cell "FARE '); [ -n "$R" ] && break; sleep 5; snap; done
[ -n "$R" ] || { echo "FAIL: no payout rows"; exit 1; }
playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 8; clear_overlays
R=$(ref 'button "Create report"'); [ -n "$R" ] || { echo "FAIL: no Create report on payout detail"; exit 1; }
playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 5; snap
R=$(ref 'button "[0-9]+/[0-9]+/20[0-9][0-9]"'); [ -n "$R" ] || { echo "FAIL: no payout date picker"; exit 1; }
playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 2; snap
R=$(ref "menuitem \"$PD\""); [ -n "$R" ] || { echo "FAIL: payout date $PD not offered: $(grep -oE 'menuitem "[^"]+"' snap.dd.txt | tr '\n' ' ')"; exit 1; }
playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 2; snap
grep -qE "button \"$PD\"" snap.dd.txt || { echo "FAIL: picker did not take $PD"; exit 1; }
R=$(grep -E 'button "Create report"' snap.dd.txt | tail -1 | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
playwright-cli -s=$S click $R >/dev/null 2>&1; sleep 10

# Reports lists the request as "Payout on Sep 17, 2026" until Download appears
LBL="Payout on $(date -d "$PD" '+%b %-d, %Y')"
for i in $(seq 1 30); do clear_overlays
  L=$(grep -n "cell \"$LBL\"" snap.dd.txt | head -1 | cut -d: -f1)
  # the Download button shows early with a Loading spinner inside it
  R=""; [ -n "$L" ] && ! sed -n "$L,$((L+5))p" snap.dd.txt | grep -q 'img "Loading"' && R=$(sed -n "$L,$((L+4))p" snap.dd.txt | grep -oE 'button "Download" (\[active\] )?.ref=[a-z0-9]+' | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2)
  [ -n "$R" ] && break; sleep 20; playwright-cli -s=$S reload >/dev/null 2>&1; sleep 8
done
[ -n "$R" ] || { echo "FAIL: report for $LBL never ready"; exit 1; }
Z=$(playwright-cli -s=$S click $R 2>&1 | grep -oE 'Downloading file [^ ]+\.zip' | awk '{print $3}'); sleep 8
# playwright-cli saves the file with dashes for underscores
F=".playwright-cli/$(echo "$Z" | tr '_' '-')"
[ -n "$Z" ] && [ -f "$F" ] || { echo "FAIL: download not found ($Z)"; exit 1; }
mkdir -p "$OUT" && unzip -o -q "$F" -d "$OUT" && ls "$OUT"

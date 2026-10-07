#!/bin/bash
# usage: store.sh <tag> <picker-text>   (picker must be closed at start)
S=C:/Users/trici/ocra-claude/.claude/skills/bowery-ubereats/scripts
T="$1"; P="$2"
playwright-cli -s=bue press Escape >/dev/null 2>&1
bash $S/snapshot.sh bue sp.txt
R=$(grep -oE 'button "(Cookshop|Rosie.s Taqueria|Shuka|Vic.s)" \[ref=[a-z0-9]+' sp.txt | head -1 | grep -oE 'f[0-9]+e[0-9]+$')
playwright-cli -s=bue click $R >/dev/null 2>&1; sleep 3
bash $S/snapshot.sh bue sp.txt
PR=$(grep -B1 "generic \[ref=[a-z0-9]*\]: $P" sp.txt | grep -oE 'paragraph \[ref=[a-z0-9]+' | grep -oE 'f[0-9]+e[0-9]+$')
AR=$(grep -oE 'button "Apply" \[ref=[a-z0-9]+' sp.txt | grep -oE 'f[0-9]+e[0-9]+$')
playwright-cli -s=bue click $PR >/dev/null 2>&1; sleep 1
playwright-cli -s=bue click $AR >/dev/null 2>&1; sleep 8
playwright-cli -s=bue reload >/dev/null 2>&1; sleep 12
bash $S/snapshot.sh bue sp.txt
DR=$(grep -oE 'textbox "Select a date range." \[ref=[a-z0-9]+' sp.txt | grep -oE 'f[0-9]+e[0-9]+$')
playwright-cli -s=bue click $DR >/dev/null 2>&1; sleep 3
bash $S/snapshot.sh bue sp.txt
CR=$(grep -oE 'gridcell "[^"]*October 2nd 2026[^"]*" \[ref=[a-z0-9]+' sp.txt | grep -oE 'f[0-9]+e[0-9]+$')
[ -n "$CR" ] || { echo "$T FAIL: no Oct 2 cell"; exit 1; }
playwright-cli -s=bue click $CR >/dev/null 2>&1; sleep 8
bash read.sh bue
bash $S/capture-backup.sh bue "$T" backup | cut -c1-80

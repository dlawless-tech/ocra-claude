# ustore.sh <store-fragment>: pick store, apply, set Sep 14-20, read
cd /c/Users/trici/ocra-claude
SN=.claude/skills/bowery-ubereats/scripts/snapshot.sh
F=.playwright-cli/uber.txt
bash $SN "" $F
SB=$(grep -A1 -E 'generic \[ref=f[0-9]+e[0-9]+\]:$' $F | grep -oE "button \"(Cookshop|Rosie|Shuka|Vic)[^\"]*\" \[ref=[a-z0-9]+\]" | head -1 | grep -oE 'f[0-9]+e[0-9]+')
playwright-cli press Escape >/dev/null 2>&1; sleep 1
playwright-cli click $SB >/dev/null 2>&1; sleep 3
bash $SN "" $F
P=$(grep -E "paragraph \[ref=[a-z0-9]+\]: $1" $F | head -1 | grep -oE 'f[0-9]+e[0-9]+')
A=$(grep -E 'button "Apply"' $F | head -1 | grep -oE 'f[0-9]+e[0-9]+')
playwright-cli click $P >/dev/null 2>&1; sleep 1
playwright-cli click $A >/dev/null 2>&1; sleep 8
bash $SN "" $F
D=$(grep -B1 'textbox "Select a date range."' $F | head -1 | grep -oE 'f[0-9]+e[0-9]+')
playwright-cli click $D >/dev/null 2>&1; sleep 3
bash $SN "" $F
G=$(grep -E 'gridcell "[^"]*Wednesday, September 16th 2026' $F | head -1 | grep -oE 'f[0-9]+e[0-9]+')
playwright-cli click $G >/dev/null 2>&1; sleep 6
playwright-cli press Escape >/dev/null 2>&1; sleep 1
bash .playwright-cli/uread.sh

# usage: bulk.sh <Approve|Unapprove|Delete>
OP="$1"; T=shuka/bulk.yml; SN=../../.claude/skills/bowery-ubereats/scripts/snapshot.sh
playwright-cli -s=sh eval "() => { document.querySelectorAll('[id^=pendo-base]').forEach(e=>e.remove()); return 1 }" >/dev/null 2>&1
bash $SN sh $T
A=$(grep -E '^ +- checkbox \[ref' $T | head -1 | grep -oE 'f[0-9]+e[0-9]+'); E=$(grep -oE 'menuitem "Edit Selected" \[ref=[^]]+' $T | grep -oE 'f[0-9]+e[0-9]+')
playwright-cli -s=sh click $A >/dev/null 2>&1; sleep 2; playwright-cli -s=sh click $E >/dev/null 2>&1; sleep 3
bash $SN sh $T
M=$(grep -oE "menuitem \"$OP\" \[ref=[^]]+" $T | grep -oE 'f[0-9]+e[0-9]+'); echo "checked=$(grep -c 'checkbox \[checked\]' $T) menu=$M"
playwright-cli -s=sh click $M 2>&1 | grep -oE '"confirm" dialog[^]]*'
sleep 3; playwright-cli -s=sh dialog-accept >/dev/null 2>&1; sleep 12
playwright-cli -s=sh requests 2>&1 | grep -E 'ServiceStack/(Transaction|.*Delete|.*pprove)' | tail -3

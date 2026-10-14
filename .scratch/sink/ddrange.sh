# usage: ddrange.sh "<Weekday, Month D, YYYY>" "<Weekday, Month D, YYYY>" <months back>
S=sdd
B=$(playwright-cli -s $S snapshot 2>&1 | grep -E 'button "(Last 7 days|[A-Z][a-z]{2} [0-9]+ ?[–-])' | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2)
playwright-cli -s $S click $B >/dev/null 2>&1; sleep 2
C=$(playwright-cli -s $S snapshot 2>&1 | grep 'menuitem "Custom date range"' | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2); playwright-cli -s $S click $C >/dev/null 2>&1; sleep 2
for i in $(seq 1 $3); do P=$(playwright-cli -s $S snapshot 2>&1 | grep 'button "Previous month"' | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2); playwright-cli -s $S click $P >/dev/null 2>&1; sleep 1; done
for d in "$1" "$2"; do SN=$(playwright-cli -s $S snapshot 2>&1); R=$(echo "$SN" | grep "button \"$d\"" | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2); [ -n "$R" ] || { echo "no day $d"; exit 1; }; playwright-cli -s $S click $R >/dev/null 2>&1; sleep 1; done
A=$(playwright-cli -s $S snapshot 2>&1 | grep -E 'button "Apply"' | grep -oE 'ref=[a-z0-9]+' | head -1 | cut -d= -f2); playwright-cli -s $S click $A >/dev/null 2>&1; sleep 8
playwright-cli -s $S eval "() => document.body.innerText" 2>&1 | sed -n '/### Result/{n;p}' | node -e 'const t=JSON.parse(require("fs").readFileSync(0,"utf8"));const i=t.indexOf("To track real-time orders");const s=t.slice(i+50);console.log(s.slice(0,s.indexOf("Transactions\n")+12).replace(/\n/g," | "))'

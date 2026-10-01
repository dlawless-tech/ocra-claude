# open All transactions in session $1, then eval the date filter file $2
S=$1; SN=/c/Users/trici/ocra-claude/.claude/skills/bowery-ubereats/scripts/snapshot.sh
r() { grep -oE "$1 .ref=f?[0-9]*e[0-9]+" s.txt | head -1 | grep -oE 'f?[0-9]*e[0-9]+$'; }
playwright-cli -s=$S goto https://fare.restaurant365.com/react/accounting >/dev/null 2>&1; sleep 12; bash $SN $S s.txt
playwright-cli -s=$S click $(grep -A3 'banner' s.txt | grep -oE 'button .ref=f?[0-9]*e[0-9]+' | head -1 | grep -oE 'f?[0-9]*e[0-9]+') >/dev/null 2>&1; sleep 2; bash $SN $S s.txt
playwright-cli -s=$S click $(r 'button "Accounting"') >/dev/null 2>&1; sleep 2; bash $SN $S s.txt
playwright-cli -s=$S click $(r 'button "Transactions"') >/dev/null 2>&1; sleep 2; bash $SN $S s.txt
playwright-cli -s=$S click $(r 'link "All transactions"') >/dev/null 2>&1; sleep 20
playwright-cli -s=$S eval "$(cat $2)" 2>&1 | sed -n '/### Result/{n;p}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const l of JSON.parse(s).split("\n"))if(/Riverside|^DoorDash/.test(l))console.log(l)})'

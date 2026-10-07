#!/bin/bash
# post30.sh <session> <loc>: duplicate the store's template, date 9/30, fill, save, verify, approve
set -u
S=$1; L=$2; P=.scratch/ngh0926
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "$L FAIL: $*"; exit 1; }
SRC=$(node -e 'const w=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.loc===process.argv[2]);process.stdout.write(w.src+" "+w.tot.toFixed(2))' $P/work30.json "$L")
TOT=${SRC#* }; SRC=${SRC% *}
# close stray tabs
while [ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -gt 1 ]; do playwright-cli -s=$S tab-close 1 >/dev/null 2>&1; done
playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$SRC" >/dev/null 2>&1; sleep 13
playwright-cli -s=$S click '#Action > a' >/dev/null 2>&1; sleep 1
R=$(playwright-cli -s=$S eval "() => { const a=Array.from(document.querySelectorAll('#Action li')).find(x=>x.innerText.trim()==='Duplicate'); if(!a) return 'nodup'; a.querySelector('a').click(); return 'ok'; }" 2>&1 | res)
case "$R" in *ok*) : ;; *) die "duplicate: $R";; esac
sleep 13
[ "$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- [0-9]+:')" -ge 2 ] || die "no duplicate tab"
playwright-cli -s=$S tab-select 1 >/dev/null 2>&1; sleep 4
NEWID=$(playwright-cli -s=$S eval "() => location.hash.split('/').pop()" 2>&1 | res | tr -d '"')
echo "$L new $NEWID"
playwright-cli -s=$S fill 'input[name="journalEntryDate"]' "9/30/2026" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill 'input[name="journalEntryNumber"]' "GrubHub" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
node $P/mkset.js "$L" > "$P/set-$L.js"
R=$(playwright-cli -s=$S eval "$(cat "$P/set-$L.js")" 2>&1 | res | sed 's/\\"/"/g')
echo "$L set $R"
case "$R" in *'"miss":[]'*"\"dr\":\"$TOT\",\"cr\":\"$TOT\""*) : ;; *) die "set check (want $TOT)";; esac
H=$(playwright-cli -s=$S eval "() => document.querySelector('input[name=journalEntryDate]').value+' '+document.querySelector('input[name=journalEntryNumber]').value" 2>&1 | res | tr -d '"')
[ "$H" = "9/30/2026 GrubHub" ] || die "header $H"
bash .claude/skills/norms-grubhub/scripts/ribbon-menu.sh $S Save "Save" >/dev/null 2>&1; sleep 12
N=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE "^[0-9]+" )
B=$(playwright-cli -s=$S response-body $N 2>&1 | grep -E '^\[\[')
case "$B" in *"\"1\",\"$NEWID\""*) : ;; *) die "save body: $B";; esac
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14
V=$(playwright-cli -s=$S eval "$(cat $P/inspect.js)" 2>&1 | res | sed 's/\\"/"/g')
echo "$L reload $V"
node -e 'const w=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).find(x=>x.loc===process.argv[2]);let v=JSON.parse(process.argv[3].replace(/^"|"$/g,""));if(v.date!=="9/30/2026"||v.num!=="GrubHub")process.exit(2);for(const l of w.lines){const r=v.rows.find(r=>r[0]===l.comment);const want=l.col==="debit"?[l.amount,0]:[0,l.amount];if(!r||Math.abs(r[1]-want[0])>0.005||Math.abs(r[2]-want[1])>0.005)process.exit(3);}' $P/work30.json "$L" "$V" || die "reload readback mismatch"
playwright-cli -s=$S click '#Approve > a' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click 'li[data-testid="approveMenuItem"]' >/dev/null 2>&1; sleep 10
N=$(playwright-cli -s=$S requests 2>&1 | grep "Transaction/Approve" | tail -1 | grep -oE "^[0-9]+")
A=$(playwright-cli -s=$S response-body $N 2>&1 | grep -o '"message":"[^"]*","transactions":\[{"id":"[^"]*"')
case "$A" in *"Successfully Approved."*"$NEWID"*) echo "$L DONE $NEWID $TOT";; *) die "approve: $A";; esac

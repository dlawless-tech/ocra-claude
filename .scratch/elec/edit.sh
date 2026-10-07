#!/bin/bash
# edit.sh <session> <date YYYY-MM-DD> <store> <id> <old> <new>   edit approved 2-line Accrued Electricity entry in place
set -u
S=$1; DT=$2; LOC=$3; ID=$4; OLD=$5; NEW=$6
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "$DT | $LOC | FAIL: $*"; exit 1; }
MDY=$(node -e 'const[y,m,d]=process.argv[1].split("-").map(Number);process.stdout.write(m+"/"+d+"/"+y)' "$DT")
READ="() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); if(!g) return 'nogrid'; const ds=g.dataSource.data(); return JSON.stringify({num:document.querySelector('[name=journalEntryNumber]').value, dt:document.querySelector('[name=journalEntryDate]').value, loc:document.querySelector('[name=journalEntryLocation_input]').value, st:(document.body.innerText.match(/Unapproved|Approved/)||['?'])[0], lines:ds.map(m=>[String(m.glAccount).slice(0,4),+m.debit||0,+m.credit||0,m.location].join(':')).join(';')}); }"
chk() { node -e 'const j=JSON.parse(JSON.parse(process.argv[1]));const [mdy,loc,a]=process.argv.slice(2);const e=[];if(j.num!=="Accrued Electricity")e.push("num="+j.num);if(j.dt!==mdy)e.push("dt="+j.dt);if(!j.loc.endsWith(" - "+loc))e.push("loc="+j.loc);const L=j.lines.split(";").map(x=>x.split(":"));if(L.length!==2)e.push("lines="+L.length);for(const l of L){if(!l[3].endsWith(" - "+loc))e.push("lineloc");if(l[0]==="2281"){if(+l[2]!==+a||+l[1]!==0)e.push("cr="+l[2])}else if(/^(5630|6330)$/.test(l[0])){if(+l[1]!==+a||+l[2]!==0)e.push("dr="+l[1])}else e.push("acct="+l[0])}process.stdout.write(e.length?"BAD "+e.join(","):"OK")' "$1" "$MDY" "$LOC" "$2"; }
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 14
B=$(playwright-cli -s=$S eval "$READ" 2>&1 | res)
C=$(chk "$B" "$OLD"); if [ "$C" != OK ]; then C2=$(chk "$B" "$NEW"); [ "$C2" = OK ] && { echo "$DT | $LOC | already $NEW"; exit 0; }; die "before: $C $B"; fi
case "$B" in *Unapproved*) die "not approved";; esac
playwright-cli -s=$S click 'button:text-is("Edit")' >/dev/null 2>&1; sleep 3
SET="() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); g.dataSource.data().forEach(m=>{const a=String(m.glAccount); if(/^2281 /.test(a)){m.set('credit',$NEW);m.set('debit',0);} else if(/^(5630|6330) /.test(a)){m.set('debit',$NEW);m.set('credit',0);}}); return 'set'; }"
playwright-cli -s=$S eval "$SET" 2>&1 | res | grep -q set || die "set failed"
sleep 2
M=$(playwright-cli -s=$S eval "$READ" 2>&1 | res); [ "$(chk "$M" "$NEW")" = OK ] || die "model: $(chk "$M" "$NEW")"
playwright-cli -s=$S click 'button:text-is("Edit Complete")' >/dev/null 2>&1 || die "no Edit Complete"
sleep 10
SN=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE '^[0-9]+|\[[0-9]+\]' | tr -d '[]' | head -1)
SB=$( [ -n "$SN" ] && playwright-cli -s=$S response-body $SN 2>&1 | grep -oE '\[\["[0-9]+"[^]]*' | head -1)
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14
A=$(playwright-cli -s=$S eval "$READ" 2>&1 | res)
[ "$(chk "$A" "$NEW")" = OK ] || die "after reload: $(chk "$A" "$NEW") save=$SB"
case "$A" in *Unapproved*) die "unapproved after";; esac
echo "$DT | $LOC | $OLD -> $NEW | OK | save=$SB"

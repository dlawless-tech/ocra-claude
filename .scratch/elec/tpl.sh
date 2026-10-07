#!/bin/bash
# tpl.sh <session> <store> <id> <new>  -- update memorized template amount
set -u
S=$1; LOC=$2; ID=$3; NEW=$4
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
READ="() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); if(!g) return 'nogrid'; return JSON.stringify({num:document.querySelector('[name=journalEntryNumber]').value, loc:document.querySelector('[name=journalEntryLocation_input]').value, title:document.title, lines:g.dataSource.data().map(m=>[String(m.glAccount).slice(0,4),+m.debit||0,+m.credit||0,m.location].join(':')).join(';')}); }"
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 14
B=$(playwright-cli -s=$S eval "$READ" 2>&1 | res); echo "before $B"
case "$B" in *"Accrued Electricity"*"- $LOC"*) ;; *) echo "$LOC | FAIL wrong entry"; exit 1;; esac
SET="() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); const ds=g.dataSource.data(); if(ds.length!==2) return 'STOP'; ds.forEach(m=>{const a=String(m.glAccount); if(/^2281 /.test(a)){m.set('credit',$NEW);m.set('debit',0);} else if(/^5630 /.test(a)){m.set('debit',$NEW);m.set('credit',0);}}); return 'set'; }"
playwright-cli -s=$S eval "$SET" 2>&1 | res | grep -q set || { echo "$LOC | FAIL set"; exit 1; }
OUT=$(bash ../../.claude/skills/danny-coops-payroll/scripts/save.sh $S); echo "save $OUT"
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 14
A=$(playwright-cli -s=$S eval "$READ" 2>&1 | res); echo "after $A"
case "$A" in *"5630:$NEW:0:"*"2281:0:$NEW:"*|*"2281:0:$NEW:"*"5630:$NEW:0:"*) echo "$LOC | template -> $NEW | OK";; *) echo "$LOC | FAIL after";; esac

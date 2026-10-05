#!/bin/bash
# Fill one UberEats journal entry that arrived Approved at 0.00, keeping it Approved.
#
# Usage: ENTRY_DATE=10/3/2026 edit-entry.sh <session> <r365-location> <work-json>
#   Same work json as post-entry.sh. Real click on Edit, model.set the five
#   lines, real click on Edit Complete, then reload and re-read.
#
# Refuses an entry that is not empty unless FORCE=1, and fails unless the five
# lines total totDr on both sides before saving and every line survives a reload.
set -u
S="$1"; LOC="$2"; WORK="$3"; ENTRY_DATE="${ENTRY_DATE:?}"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "$LOC FAIL: $*"; exit 1; }
REC=$(node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(JSON.stringify(d.find(x=>x.loc===process.argv[2])))' "$WORK" "$LOC")
ID=$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).id)' "$REC")
playwright-cli -s=$S goto "https://norms.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1
sleep 14
READ="() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); if(!g) return 'nogrid'; const ds=g.dataSource.data(); const L=['a/r ubereats - payout','marketing','uber fees','net chargeback amount','difference']; const o={dt:(document.querySelector('input[name=journalEntryDate]')||{}).value, st:(document.body.innerText.match(/Unapproved|Approved/)||['?'])[0], n:ds.length, locs:[...new Set(ds.map(m=>m.location))].join(',')}; for(const l of L){const m=ds.find(x=>x.comment===l); o[l]=m?(+m.debit||0).toFixed(2)+'/'+(+m.credit||0).toFixed(2):'MISSING';} const rows=Array.from(document.querySelectorAll('tbody tr')).map(r=>Array.from(r.cells).map(c=>c.innerText.trim())); let dr=0,cr=0; for(const l of L){const t=rows.find(x=>x.includes(l)); if(t){const i=t.indexOf(l); dr+=parseFloat((t[i-2]||'0').replace(/,/g,''))||0; cr+=parseFloat((t[i-1]||'0').replace(/,/g,''))||0;}} o.cells=dr.toFixed(2)+'/'+cr.toFixed(2); return JSON.stringify(o); }"
B=$(playwright-cli -s=$S eval "$READ" 2>&1 | res)
echo "$LOC before: $B"
case "$B" in *"\\\"dt\\\":\\\"$ENTRY_DATE\\\""*|*"\"dt\":\"$ENTRY_DATE\""*) : ;; *) die "wrong date or not loaded";; esac
case "$B" in *" - $LOC"*) : ;; *) die "wrong location";; esac
case "$B" in *MISSING*) die "template lines missing";; esac
case "$B" in *'cells\":\"0.00/0.00'*|*'cells":"0.00/0.00'*) : ;; *) [ "${FORCE:-0}" = 1 ] || die "entry not empty, skip";; esac

playwright-cli -s=$S click 'button:text-is("Edit")' >/dev/null 2>&1 || true
sleep 3
SET="() => { const r=$REC; const g=jQuery('[data-role=grid]').data('kendoGrid'); const ds=g.dataSource.data(); const f=c=>ds.find(x=>x.comment===c); const put=(c,d,cr)=>{const m=f(c); m.set('debit',d); m.set('credit',cr);}; put('a/r ubereats - payout',0,r.arCredit); put('marketing',r.marketing,0); put('uber fees',r.fees,0); put('net chargeback amount',r.ncDr,r.ncCr); put('difference',r.diffDr,r.diffCr); return 'set'; }"
playwright-cli -s=$S eval "$SET" 2>&1 | res | grep -q set || die "model.set failed"
sleep 2
WANT=$(node -e 'const r=JSON.parse(process.argv[1]);process.stdout.write(r.totDr.toFixed(2)+"/"+r.totDr.toFixed(2))' "$REC")
M=$(playwright-cli -s=$S eval "$READ" 2>&1 | res)
echo "$LOC set: $M"
case "$M" in *"$WANT"*) : ;; *) die "cells total != $WANT";; esac
EXP=$(node -e 'const r=JSON.parse(process.argv[1]);const f=(a,b)=>a.toFixed(2)+"/"+b.toFixed(2);process.stdout.write([f(0,r.arCredit),f(r.marketing,0),f(r.fees,0),f(r.ncDr,r.ncCr),f(r.diffDr,r.diffCr)].join(";"))' "$REC")
chk() { local J="$1"; node -e 'const j=JSON.parse(JSON.parse(process.argv[1]));const e=process.argv[2].split(";");const L=["a/r ubereats - payout","marketing","uber fees","net chargeback amount","difference"];const bad=L.filter((l,i)=>j[l]!==e[i]);process.stdout.write(bad.length?"BAD:"+bad.join(","):"OK")' "$J" "$EXP"; }
[ "$(chk "$M")" = OK ] || die "model mismatch $(chk "$M")"

N0=$(playwright-cli -s=$S requests 2>&1 | grep -c SaveTransaction)
playwright-cli -s=$S click 'button:text-is("Edit Complete")' >/dev/null 2>&1 || die "no Edit Complete button"
sleep 10
SN=$(playwright-cli -s=$S requests 2>&1 | grep SaveTransaction | tail -1 | grep -oE '^[0-9]+|\[[0-9]+\]' | tr -d '[]' | head -1)
SB=$( [ -n "$SN" ] && playwright-cli -s=$S response-body $SN 2>&1 | grep -oE '\[\["[0-9]+"[^]]*' | head -1)
echo "$LOC save: $SB"
playwright-cli -s=$S reload >/dev/null 2>&1
sleep 14
A=$(playwright-cli -s=$S eval "$READ" 2>&1 | res)
echo "$LOC after: $A"
[ "$(chk "$A")" = OK ] || die "after reload mismatch $(chk "$A")"
case "$A" in *'Approved'*) : ;; *) die "not approved";; esac
case "$A" in *Unapproved*) die "unapproved";; esac
echo "$LOC DONE"

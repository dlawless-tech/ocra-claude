#!/bin/bash
# Set the fee and comment on a Flecha GrubHub entry, save, reload, read back, approve.
# An Approved entry is unapproved first, so a true-up reuses this on last week's estimate.
# usage: fill-entry.sh <session> <TransactionId> <M/D/YYYY> <fee> [comment]
# Prints "OK <id> <fee>" or "FAIL: ...".
set -u
S=$1; ID0=$2; DT=$3; FEE=$4; CMT=${5:-}
case "$CMT" in *\'*|*\"*|*\\*) echo "FAIL: comment may not carry quotes or backslashes"; exit 1;; esac
APP=https://flecha.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
die() { echo "FAIL: $*"; exit 1; }
body() {  # body <url fragment>: response body of the latest matching request
  local N=$(playwright-cli -s=$S requests 2>&1 | grep "$1" | tail -1 | grep -oE '^[^0-9]*[0-9]+' | grep -oE '[0-9]+$')
  [ -n "$N" ] && playwright-cli -s=$S response-body "$N" 2>&1 | grep -v "^[║╔╚]" | tr -d "
"; }
H=$(playwright-cli -s=$S eval '() => location.hash' 2>&1 | res)
case "$H" in
  *"$ID0"*) : ;;
  *) playwright-cli -s=$S goto "$APP/#/form/JournalEntryForm/$ID0" >/dev/null 2>&1; sleep 14;;
esac
ST=$(playwright-cli -s=$S eval "() => document.querySelector('#Unapprove') && document.querySelector('#Unapprove').offsetParent ? 'Approved' : 'open'" 2>&1 | res | tr -d '"')
if [ "$ST" = Approved ]; then
  playwright-cli -s=$S click '#Unapprove > a' >/dev/null 2>&1; sleep 2
  playwright-cli -s=$S click 'li[data-testid="unapproveMenuItem"]' >/dev/null 2>&1; sleep 8
  body Transaction/UnApprove | grep -q 'unapproved successfully' || die "unapprove $ID0"
  playwright-cli -s=$S goto "$APP/#/form/JournalEntryForm/$ID0" >/dev/null 2>&1; sleep 14
fi
playwright-cli -s=$S fill '#journalEntryComment' "$CMT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1
playwright-cli -s=$S fill '#journalEntryDate' "$DT" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
playwright-cli -s=$S fill '#journalEntryNumber' "GrubHub" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 2

# set both lines through the Kendo model
R=$(playwright-cli -s=$S eval "() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); const ls=g.dataSource.data().slice(); if(ls.length!==2) return 'ERR lines '+ls.length; for(const m of ls){ if(/^1242 /.test(m.glAccount)){ m.set('debit',0); m.set('credit',$FEE); m.set('comment','$CMT'); } else if(/^7161 /.test(m.glAccount)){ m.set('debit',$FEE); m.set('credit',0); m.set('comment','$CMT'); } else return 'ERR account '+m.glAccount; } return document.querySelector('#journalEntryDate').value+'|'+document.querySelector('#journalEntryNumber').value; }" 2>&1 | res | tr -d '"')
[ "$R" = "$DT|GrubHub" ] || die "set: $R"

# ribbon items only commit on real clicks
# the menu can miss its first click after an unapprove reload, so try twice
B=
for TRY in 1 2; do
  playwright-cli -s=$S click '#Save > a' >/dev/null 2>&1; sleep 3
  playwright-cli -s=$S click 'li[data-testid="saveMenuItem"]' >/dev/null 2>&1; sleep 10
  B=$(body SaveTransaction); [ -n "$B" ] && break
done
ID=$(echo "$B" | grep -oE '1[\\"]*,[\\"]*[0-9a-f-]{36}' | grep -oE '[0-9a-f-]{36}' | head -1)
[ -n "$ID" ] || die "save: $B"

# reload and read back
playwright-cli -s=$S goto "$APP/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 14
V=$(playwright-cli -s=$S eval "() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); const f=x=>Math.round(x*100); const ls=g.dataSource.data().slice(); const a=ls.find(m=>/^1242 /.test(m.glAccount)), e=ls.find(m=>/^7161 /.test(m.glAccount)); return [document.querySelector('#journalEntryDate').value, document.querySelector('#journalEntryNumber').value, a&&f(a.credit)===f($FEE)&&f(a.debit)===0, e&&f(e.debit)===f($FEE)&&f(e.credit)===0, a.comment==='$CMT'&&e.comment==='$CMT'&&document.querySelector('#journalEntryComment').value==='$CMT'].join('|'); }" 2>&1 | res | tr -d '"')
[ "$V" = "$DT|GrubHub|true|true|true" ] || die "readback $ID: $V"

playwright-cli -s=$S click '#Approve > a' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click 'li[data-testid="approveMenuItem"]' >/dev/null 2>&1; sleep 10
B=$(body Transaction/Approve)
echo "$B" | grep -q 'Successfully Approved' || die "approve $ID: $B"
echo "OK $ID $FEE"

#!/bin/bash
# Import a journal entry CSV through Create > Import Journal Entry, unapproved, not payroll.
# usage: import.sh <session> <csv, relative to the session directory> <expected entry count>
# Prints the Import Result line; exits nonzero unless it reads Success and the count created.
set -u
S=$1; CSV=$2; N=$3
P="playwright-cli -s=$S"
res() { sed -n '/### Result/{n;p;}'; }
[ "$($P eval '() => location.hostname' 2>&1 | res)" = '"bowerygroup.restaurant365.com"' ] || { echo "FAIL: logged out"; exit 1; }
$P goto about:blank >/dev/null 2>&1
$P goto "https://bowerygroup.restaurant365.com/#/form/ImportJournalEntryForm/70" >/dev/null 2>&1
for i in $(seq 1 10); do sleep 5; [ "$($P eval "() => !!document.getElementById('approvalStatus')" 2>&1 | res)" = true ] && break; done
# a real click per box, so Angular sees the change
for id in beginningBalance approvalStatus payrollJE; do
  [ "$($P eval "() => document.getElementById('$id').checked" 2>&1 | res)" = true ] && $P click "#$id" >/dev/null 2>&1
done
sleep 1
B=$($P eval "() => ['beginningBalance','approvalStatus','payrollJE'].map(i => document.getElementById(i).checked).join(',')" 2>&1 | res)
[ "$B" = '"false,false,false"' ] || { echo "FAIL: checkboxes read $B"; exit 1; }
# only the Choose File button opens the chooser; #importTest does not. Choosing the file starts the import
$P snapshot --filename=.imp.yml >/dev/null 2>&1
REF=$(grep -oP 'button "Choose File" \[ref=\K[^\]]+' .imp.yml | head -1); rm -f .imp.yml
[ -n "$REF" ] || { echo "FAIL: no Choose File button"; exit 1; }
$P click "$REF" 2>&1 | grep -q 'File chooser' || { echo "FAIL: Choose File opened no chooser"; exit 1; }
$P upload "$CSV" >/dev/null 2>&1
for i in $(seq 1 12); do sleep 5
  R=$($P eval "() => (document.body.innerText.match(/Import Result[\\s\\S]{0,300}/) || [''])[0]" 2>&1 | res)
  echo "$R" | grep -qE 'record\(s\) created|Error|Fail' && break
done
echo "$R"
echo "$R" | grep -q 'Success' && echo "$R" | grep -qE "\b$N record\(s\) created" || { echo "FAIL: expected $N record(s) created"; exit 1; }

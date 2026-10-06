#!/bin/bash
# Read one DoorDash entry back from R365 and compare it with its lines.json row: date, number,
# header, comment, both lines at the fee. Prints MATCH or FAIL with what differs.
# usage: check-entry.sh <session> <lines.json> <Sunday M/D/YYYY> <location> <TransactionId>
set -u
S="$1"; L="$2"; WE="$3"; LOC="$4"; ID="$5"
HOST=https://flecha.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
ROW=$(node -e 'const x=require(require("path").resolve(process.argv[1])).find(v=>v.weekEnding===process.argv[2]&&v.loc===process.argv[3]);if(!x)process.exit(1);process.stdout.write(JSON.stringify(x))' "$L" "$WE" "$LOC") || { echo "FAIL: no line for $LOC $WE"; exit 1; }
# same-hash goto does not reload
playwright-cli -s=$S goto about:blank >/dev/null 2>&1
playwright-cli -s=$S goto "$HOST/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 20
cat > fdd-read.js <<'JS'
() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); if(!g) return 'nogrid';
return JSON.stringify({ date:jQuery('#journalEntryDate').val(), num:jQuery('#journalEntryNumber').val(), loc:jQuery('#journalEntryLocation').data('kendoComboBox').text(), cmt:jQuery('#journalEntryComment').val(),
  lines:g.dataSource.data().map(m=>({a:m.glAccount, dr:+m.debit||0, cr:+m.credit||0, loc:m.location})) }); }
JS
playwright-cli -s=$S eval "$(cat fdd-read.js)" 2>&1 | res > fdd-readback.txt
node -e '
const x=JSON.parse(process.argv[1]); let r;
try { r=JSON.parse(JSON.parse(require("fs").readFileSync(process.argv[2],"utf8").trim())); } catch(e) { console.log("FAIL "+x.loc+" "+x.weekEnding+" unreadable entry"); process.exit(1); }
const f=Math.abs(x.fee), dr=x.fee>=0, bad=[];
if (r.date!==x.weekEnding) bad.push("date "+r.date); if (r.num!=="DoorDash") bad.push("number "+r.num); if (r.loc!==x.loc) bad.push("header "+r.loc);
if (r.cmt!==x.comment) bad.push("comment");
const e=r.lines.find(l=>/^7161 /.test(l.a)), a=r.lines.find(l=>/^1239 /.test(l.a));
if (r.lines.length!==2||!e||!a) bad.push("lines "+JSON.stringify(r.lines)); else {
  if (Math.abs((dr?e.dr:e.cr)-f)>.001||Math.abs((dr?a.cr:a.dr)-f)>.001) bad.push("amounts "+(e.dr||-e.cr));
  if (r.lines.some(l=>l.loc!==x.loc)) bad.push("line location"); }
console.log((bad.length?"FAIL ":"MATCH ")+x.loc+" "+x.weekEnding+" "+x.basis+" "+x.fee+(bad.length?" "+bad.join("; "):""));
process.exit(bad.length?1:0)' "$ROW" fdd-readback.txt

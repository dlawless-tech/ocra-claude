#!/bin/bash
# fillall.sh <session> "<comment>|<debit>|<credit>" ... ; fills both columns of every line, zeros included
S="$1"; shift
HERE=.claude/skills/bowery-grubhub/scripts
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d' | tr -d '\n'; }
n2() { local x; x=$(echo "$1" | sed -e "s/,//g" -e "s/\"//g"); printf "%.2f" "$x" 2>/dev/null || echo "$1"; }
jsq() { node -e 'const B=String.fromCharCode(92),Q=String.fromCharCode(39),D=String.fromCharCode(34);process.stdout.write(Q+JSON.stringify(process.argv[1]).slice(1,-1).split(B+D).join(B+"x22").split(Q).join(B+"x27")+Q)' "$1"; }
TMP=$(mktemp); bash $HERE/snapshot.sh $S $TMP
LN=$(grep -n 'gridcell "commissions"' $TMP | head -1 | cut -d: -f1); [ -n "$LN" ] || { echo "FAIL wake"; exit 1; }
WREF=$(sed -n "$((LN-1))p" $TMP | grep -oE "ref=[a-zA-Z0-9]+" | head -1 | cut -d= -f2)
playwright-cli -s=$S click $WREF >/dev/null 2>&1; sleep 2; playwright-cli -s=$S press Escape >/dev/null 2>&1; sleep 1
for spec in "$@"; do IFS='|' read -r c dr cr <<< "$spec"; L=$(jsq "$c")
 for C in debit credit; do A=$([ $C = debit ] && echo $dr || echo $cr)
  R=$(playwright-cli -s=$S eval "() => { const r=Array.from(document.querySelectorAll('tr')).find(x=>Array.from(x.cells||[]).some(c=>c.innerText.trim()===$L)); if(!r) return 'ERR-norow'; const cells=Array.from(r.cells); const i=cells.findIndex(c=>c.innerText.trim()===$L); cells[i-('$C'==='debit'?2:1)].click(); return 'ok'; }" 2>&1 | res)
  case "$R" in *ok*) : ;; *) echo "FAIL click $c/$C $R"; exit 1;; esac
  sleep 2; playwright-cli -s=$S fill "input[name=\"$C\"]" "$A" >/dev/null 2>&1; playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1; playwright-cli -s=$S press Escape >/dev/null 2>&1; sleep 1
  V=$(playwright-cli -s=$S eval "() => { const r=Array.from(document.querySelectorAll('tr')).find(x=>Array.from(x.cells||[]).some(c=>c.innerText.trim()===$L)); const cells=Array.from(r.cells); const i=cells.findIndex(c=>c.innerText.trim()===$L); return cells[i-('$C'==='debit'?2:1)].innerText.trim(); }" 2>&1 | res)
  [ "$(n2 "$V")" = "$(n2 "$A")" ] || { echo "FAIL $c/$C read '$V' want '$A'"; exit 1; }
 done; done
playwright-cli -s=$S eval "() => { const rows=Array.from(document.querySelectorAll('tr')).map(r=>Array.from(r.cells||[]).map(c=>c.innerText.trim())).filter(t=>t.length>=8 && /\d{3}-\d{2}/.test(t[1]||'')); let d=0,c=0; for(const t of rows){d+=parseFloat(t[3].replace(/,/g,''))||0;c+=parseFloat(t[4].replace(/,/g,''))||0;} return [document.querySelector('input[name=journalEntryDate]').value, document.querySelector('input[name=journalEntryNumber]').value, d.toFixed(2)+'/'+c.toFixed(2), ...rows.map(t=>t.slice(3,7).join(' | '))].join(' ;; '); }" 2>&1 | res

#!/bin/bash
set -u
S=water
LOG=.scratch/water/approve.log
: > $LOG
res() { sed -n '/### Result/,/### Ran/p' | sed '1d;$d'; }

while IFS=$'\t' read -r LOC AMT; do
  [ -z "${LOC:-}" ] && continue
  playwright-cli -s=$S tab-select 0 >/dev/null 2>&1
  sleep 1
  sed "s|__T__|$LOC|" .scratch/water/openloc.js > .scratch/water/_o.js
  O=$(playwright-cli -s=$S eval "$(cat .scratch/water/_o.js)" 2>&1 | res)
  case "$O" in *opened*) ;; *) echo "$LOC | OPEN FAILED: $O" >> $LOG; continue;; esac
  sleep 7
  playwright-cli -s=$S tab-select 2 >/dev/null 2>&1
  sleep 3
  V=$(playwright-cli -s=$S eval "$(cat .scratch/water/verify.js)" 2>&1 | res)
  OK=$(node -e '
    const v=JSON.parse(JSON.parse(process.argv[1]));
    const loc=process.argv[2], amt=Number(process.argv[3]);
    const errs=[];
    if(v.num!=="Accrued Water") errs.push("number="+v.num);
    if(v.date!=="9/12/2026") errs.push("date="+v.date);
    if(!v.loc.endsWith(" - "+loc)) errs.push("hdrloc="+v.loc);
    if(v.debit!==amt||v.credit!==amt) errs.push("D/C="+v.debit+"/"+v.credit);
    if(v.lines.length!==2) errs.push("lines="+v.lines.length);
    const dr=v.lines.find(l=>l.a.startsWith("5635")), cr=v.lines.find(l=>l.a.startsWith("2285"));
    if(!dr||dr.d!==amt||dr.c!==0) errs.push("debitline");
    if(!cr||cr.c!==amt||cr.d!==0) errs.push("creditline");
    v.lines.forEach(l=>{ if(!l.l.endsWith(" - "+loc)) errs.push("lineloc="+l.l); });
    process.stdout.write(errs.length?("BAD: "+errs.join(",")):"OK");
  ' "$V" "$LOC" "$AMT" 2>&1)
  if [ "$OK" != "OK" ]; then
    echo "$LOC | NOT APPROVED | $OK | $V" >> $LOG
    playwright-cli -s=$S tab-close 2 >/dev/null 2>&1
    continue
  fi
  playwright-cli -s=$S hover '#Approve > a' >/dev/null 2>&1
  sleep 2
  playwright-cli -s=$S eval "() => { const li=document.getElementById('Approve'); const items=Array.from(li.querySelectorAll('ul li a, ul li button')).filter(a=>a.innerText.trim()==='Approve and Close'); items[items.length-1].click(); return 'ok'; }" >/dev/null 2>&1
  sleep 8
  T=$(playwright-cli -s=$S tab-list 2>&1 | grep -cE '^- 2:')
  if [ "$T" != "0" ]; then playwright-cli -s=$S tab-close 2 >/dev/null 2>&1; fi
  echo "$LOC | verified $AMT | approve+close sent" >> $LOG
  sleep 1
done < .scratch/water/approve.tsv
echo DONE >> $LOG

#!/bin/bash
# Sum a week's AP invoices on 52300 Meat Purchases and price the 2.1% credit.
# Also prints the latest invoice date in the week as last=.
# usage: week-invoices.sh <session> <glurl.txt> <Monday M/D/YYYY> <Sunday M/D/YYYY>
# glurl.txt holds a GL Account Detail url for 52300 from the Meat Credit report's
# drill-down; only its Start and End change. Stock Count and JE rows stay out.
set -u
S="$1"; URLF="$2"; MON="$3"; SUN="$4"
U=$(sed "s#Start=[^&]*#Start=$MON#; s#End=[^&]*#End=$SUN#" "$URLF")
playwright-cli -s=$S goto "$U" >/dev/null 2>&1
for i in $(seq 1 12); do
  sleep 5
  R=$(playwright-cli -s=$S eval "() => { const rows=[...document.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>td.innerText.trim()).filter(Boolean));
    if(!rows.some(r=>r.some(c=>/^Grand Total$/.test(c)))) return 'wait';
    const n=s=>Math.round(Number(String(s).replace(/,/g,''))*100);
    const inv=rows.filter(r=>r[1]==='AP Invoice');
    const cents=inv.reduce((t,r)=>t+n(r.at(-3))-n(r.at(-2)),0);
    const last=inv.map(r=>r[0]).sort((a,b)=>new Date(a)-new Date(b)).pop()||'none';
    return 'invoices='+(cents/100).toFixed(2)+' count='+inv.length+' credit='+(Math.round(cents*21/1000)/100).toFixed(2)+' last='+last; }" 2>&1 | sed -n '/### Result/{n;p;}' | tr -d '"')
  [ "$R" != wait ] && [ -n "$R" ] && { echo "WEEK $SUN $R"; exit 0; }
done
echo "FAIL: $SUN GL detail did not render"; exit 1

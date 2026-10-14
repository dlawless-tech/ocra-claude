# usage: ddopen.sh <text in row>
S=sdd
playwright-cli -s $S go-back >/dev/null 2>&1; sleep 7
playwright-cli -s $S eval "() => { const b=[...document.querySelectorAll('button,[role=button],a,div')].filter(x=>x.innerText&&x.innerText.includes('$1')&&x.innerText.length<200).pop(); if(!b) return 'none'; (b.closest('button,[role=button],a')||b).click(); return 'ok'; }" 2>&1 | sed -n '/### Result/{n;p}'; sleep 8
playwright-cli -s $S eval "() => document.body.innerText" 2>&1 | sed -n '/### Result/{n;p}' | node -e 'const t=JSON.parse(require("fs").readFileSync(0,"utf8"));let i=t.indexOf("Payout #");if(i<0)i=t.indexOf("Net total")-200;const s=t.slice(i);console.log(s.slice(0,s.indexOf("Transactions\n")+12).replace(/\n/g," | "))'

S=del; R365=https://bowerygroup.restaurant365.com
node -e "require('./todelete.json').forEach(x=>console.log([x.k,x.id,x.amt.toFixed(2)].join(' ')))" | while read K ID AMT; do
  grep -q "$ID" unap.log 2>/dev/null && continue
  F=BankExpenseForm; [ "$K" = d ] && F=BankDepositForm
  playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "$R365/#/form/$F/$ID" >/dev/null 2>&1; sleep 16
  ST=$(playwright-cli -s=$S eval "() => { const t=document.body.innerText+' '+[...document.querySelectorAll('input')].map(i=>i.value).join(' '); const n=Number('$AMT'); const ok=t.includes(n.toLocaleString('en-US',{minimumFractionDigits:2}))||t.includes(n.toFixed(2)); return (document.getElementById('Unapprove')?'A':'U')+(ok?'1':'0'); }" 2>&1 | grep -A1 Result | tail -1 | tr -d '"')
  case "$ST" in
    U1) echo "ALREADY $ID $AMT" >> unap.log; continue;;
    A1) ;;
    *) echo "SKIP $ID $AMT state=$ST" >> unap.log; continue;;
  esac
  playwright-cli -s=$S click '#Unapprove > a' >/dev/null 2>&1; sleep 1
  playwright-cli -s=$S eval "() => { const a=[...document.querySelectorAll('#Unapprove ul a, #Unapprove ul li')].find(e=>e.innerText.trim()==='Unapprove'); a.click(); return 1; }" >/dev/null 2>&1; sleep 7
  ST2=$(playwright-cli -s=$S eval "() => document.getElementById('Unapprove')?'A':'U'" 2>&1 | grep -A1 Result | tail -1 | tr -d '"')
  [ "$ST2" = U ] && echo "OK $ID $AMT" >> unap.log || echo "FAIL $ID $AMT" >> unap.log
done
echo END >> unap.log

S=be; ID=$1
playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/BankReconciliationForm/$ID" >/dev/null 2>&1; sleep 22
playwright-cli -s=$S eval "() => document.title + ' :: ' + [...document.querySelectorAll('a[title]')].map(a=>a.title).filter(t=>/8281|Chase/i.test(t)).join(' | ')" 2>&1 | grep -A1 Result | tail -1

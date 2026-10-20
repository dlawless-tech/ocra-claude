#!/bin/bash
S=brec; res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "https://bowerygroup.restaurant365.com/#/form/BankReconciliationForm/$1" >/dev/null 2>&1; sleep 30
playwright-cli -s=$S eval "() => document.title + ' | ' + document.body.innerText.match(/Beginning Balance[\s\S]{0,200}/)[0].replace(/\s+/g,' ')" 2>&1 | res

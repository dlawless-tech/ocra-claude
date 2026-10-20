#!/bin/bash
set -u; S=amex; res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
playwright-cli -s=$S hover '#Save > a' >/dev/null 2>&1; sleep 1
playwright-cli -s=$S eval "() => { const li=document.getElementById('Save'); const items=Array.from(li.querySelectorAll('ul li a, ul li button')); const it=items.filter(a=>a.innerText.trim()==='Save'); if(!it.length) return 'opts: '+items.map(a=>a.innerText.trim()).join('/'); it[it.length-1].click(); return 'clicked'; }" 2>&1 | res
sleep 10
playwright-cli -s=$S eval "() => (document.querySelector('.toast-message, .k-notification, .alert')||{}).innerText || 'no toast'" 2>&1 | res

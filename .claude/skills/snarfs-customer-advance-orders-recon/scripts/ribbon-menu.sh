#!/bin/bash
# Click one item of a form ribbon menu (Save, Approve, Action) by its exact text.
# usage: ribbon-menu.sh <session> <menu id> <exact item text>
playwright-cli -s=$S hover "#$MENU > a" >/dev/null 2>&1
sleep 2
playwright-cli -s=$S eval "() => { const li=document.getElementById('$MENU'); const items=Array.from(li.querySelectorAll('ul li a, ul li button')); const t=items.filter(a=>a.innerText.trim()==='$ITEM'); if(!t.length) return 'ERR-noitem:'+items.map(a=>a.innerText.trim()).join(','); t[t.length-1].click(); return 'clicked'; }" 2>&1 | sed -n '/### Result/,/### Ran/p' | tr -d '\n'

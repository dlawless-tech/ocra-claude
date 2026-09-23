# setdiff.sh <session> <amount>: set difference debit, read back grid
S=$1; A=$2
cd /c/Users/trici/ocra-claude
r() { sed -n '/### Result/,/### Ran/p' | sed '1d;$d'; }
playwright-cli -s=$S eval "() => { const r=Array.from(document.querySelectorAll('tr')).find(x=>Array.from(x.cells||[]).some(c=>c.innerText.trim()==='difference')); const cells=Array.from(r.cells); const i=cells.findIndex(c=>c.innerText.trim()==='difference'); cells[i-2].click(); return 'ok'; }" 2>&1 | r
sleep 2
playwright-cli -s=$S fill 'input[name="debit"]' "$A" >/dev/null 2>&1
playwright-cli -s=$S press Tab >/dev/null 2>&1; sleep 1
playwright-cli -s=$S press Escape >/dev/null 2>&1; sleep 1
playwright-cli -s=$S eval "() => Array.from(document.querySelectorAll('tr')).filter(r=>r.closest('[data-role=grid]')).slice(1,6).map(r=>Array.from(r.cells||[]).map(c=>c.innerText.trim()).filter((v,i)=>[2,3,4,5].includes(i)).join(' | '))" 2>&1 | r

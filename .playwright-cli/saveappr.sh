# saveappr.sh <session> <want-total>: save, reload, verify 4 lines sum, approve+close
S=$1; W=$2
cd /c/Users/trici/ocra-claude
M=.claude/skills/bowery-ubereats/scripts/ribbon-menu.sh
r() { sed -n '/### Result/,/### Ran/p' | sed '1d;$d' | tr -d '\n "'; }
bash $M $S Save Save >/dev/null; sleep 12
playwright-cli -s=$S reload >/dev/null 2>&1; sleep 15
V=$(playwright-cli -s=$S eval "() => { const L=['a/r debit from prior week less total payout','uber fees','difference','marketing']; const rows=Array.from(document.querySelectorAll('tr')).filter(r=>r.closest('[data-role=grid]')).map(r=>Array.from(r.cells||[]).map(c=>c.innerText.trim())); let dr=0,cr=0,out=[]; for(const l of L){ const t=rows.find(x=>x[5]===l); if(!t) return 'MISSING:'+l; out.push(l+'='+t[3]+'/'+t[4]); dr+=parseFloat(t[3].replace(/,/g,''))||0; cr+=parseFloat(t[4].replace(/,/g,''))||0; } return out.join(';')+'|TOT='+dr.toFixed(2)+'/'+cr.toFixed(2); }" 2>&1 | r)
echo "after reload: $V"
case "$V" in *"TOT=$W/$W") : ;; *) echo "FAIL: not approving"; exit 1;; esac
bash $M $S Approve "Approve and Close" >/dev/null; sleep 14
echo APPROVED-CLICKED

#!/bin/bash
# add line comments to one entry, save, read back. usage: cm.sh <id> <1103 comment>
set -u
ID="$1"; CL="$2"
res() { sed -n '/### Result/{n;p}'; }
playwright-cli -s=fghr goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 22
cat > setc.js <<JS
() => { const C={'1103':'$CL','7350':'delivery + order processing','7340':'catering delivery + order processing','7570':'marketing + ad spend','4905':'restaurant promotions','7535':'cancellations + order adjustments','2270':'sales tax withheld'};
const g=jQuery('[data-role=grid]').data('kendoGrid'); const out=[];
for (const m of Array.prototype.slice.call(g.dataSource.data())) { if (m.comment) { out.push('kept '+m.glAccount); continue; } const c=C[m.glAccount.slice(0,4)]; if(!c) return 'STOP: no comment for '+m.glAccount; m.set('comment',c); m.dirty=true; out.push(m.glAccount.slice(0,4)); }
return out.join(','); }
JS
echo "set: $(playwright-cli -s=fghr eval "$(cat setc.js)" 2>&1 | res)"
echo "save: $(bash ../../.claude/skills/danny-coops-payroll/scripts/save.sh fghr)"
playwright-cli -s=fghr goto "https://fare.restaurant365.com/#/form/JournalEntryForm/$ID" >/dev/null 2>&1; sleep 22
playwright-cli -s=fghr eval "$(cat rb.js)" 2>&1 | res

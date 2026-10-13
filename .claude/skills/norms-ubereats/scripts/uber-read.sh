#!/bin/bash
# Read one store's pay period off Payments > Payouts as one JSON line.
# DAY is any date inside the period, as the calendar's aria label writes it ("October 7th 2026").
# usage: uber-read.sh <session> "<Uber store name>" "<DAY>"
set -u
S="$1"; STORE="$2"; DAY="$3"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
jsq() { node -e 'const B=String.fromCharCode(92),Q=String.fromCharCode(39),D=String.fromCharCode(34);process.stdout.write(Q+JSON.stringify(process.argv[1]).slice(1,-1).split(B+D).join(B+"x22").split(Q).join(B+"x27")+Q)' "$1"; }
N=$(jsq "$STORE")
playwright-cli -s=$S click '#store-selector-trigger' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S fill 'input[placeholder*="Search"]' "$STORE" >/dev/null 2>&1; sleep 2
playwright-cli -s=$S eval "() => { const e=Array.from(document.querySelectorAll('button span, button p')).find(x=>x.innerText.trim().toLowerCase()===$N.toLowerCase() && x.closest('button').id!=='store-selector-trigger'); if(!e) return 'none'; e.closest('button').click(); return 'ok'; }" >/dev/null 2>&1
playwright-cli -s=$S click 'button:text-is("Apply")' >/dev/null 2>&1; sleep 5
playwright-cli -s=$S click 'input[aria-label="Select a date range."]' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S click "[aria-label*=\"$DAY\"]" >/dev/null 2>&1; sleep 8
playwright-cli -s=$S eval "() => {
  const n = s => { const m = String(s).replace(/[,\$\s]/g,'').match(/(-|−)?\(?(\d+(\.\d+)?)\)?/); return m ? (m[1] || /\(/.test(s) ? -1 : 1) * +m[2] : null; };
  const t = document.body.innerText;
  const range = (t.match(/Selected date range is from (\S+) to (\S+)/) || []).slice(1);
  const tree = document.querySelector('[role=tree]');
  const rows = tree ? Array.from(tree.querySelectorAll(':scope > [role=treeitem], :scope > * > [role=treeitem]')).map(r => { const l = r.innerText.split('\n').map(x=>x.trim()).filter(Boolean); return [l[0], n(l[l.length-1])]; }) : [];
  const tp = (t.match(/Total payout\s*\n?\s*(-?\\\$?[\d,]+\.\d\d|\\\$?-?[\d,]+\.\d\d)/i) || [])[1];
  return JSON.stringify({ store: document.querySelector('#store-selector-trigger').innerText.trim(), range, totalPayout: tp ? n(tp) : null, rows });
}" 2>&1 | res

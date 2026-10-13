#!/bin/bash
# Read one store's pay period off Payments > Payouts as one JSON line.
# END is the period's last day as the Payout History writes it ("Oct 11"); the row ending on it is opened and expanded.
# usage: uber-read.sh <session> "<Uber store name>" "<END>"
set -u
S="$1"; STORE="$2"; END="$3"
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
jsq() { node -e 'const B=String.fromCharCode(92),Q=String.fromCharCode(39),D=String.fromCharCode(34);process.stdout.write(Q+JSON.stringify(process.argv[1]).slice(1,-1).split(B+D).join(B+"x22").split(Q).join(B+"x27")+Q)' "$1"; }
N=$(jsq "$STORE"); MON=${END% *}; DAY=${END#* }
playwright-cli -s=$S goto https://merchants.ubereats.com/manager/payments >/dev/null 2>&1; sleep 8
playwright-cli -s=$S click 'button:text-is("Ok got it")' >/dev/null 2>&1
playwright-cli -s=$S click '#store-selector-trigger' >/dev/null 2>&1; sleep 2
playwright-cli -s=$S fill 'input[placeholder*="Search"]' "$STORE" >/dev/null 2>&1; sleep 2
playwright-cli -s=$S eval "() => { const e=Array.from(document.querySelectorAll('button span, button p')).find(x=>x.innerText.trim().toLowerCase()===$N.toLowerCase() && x.closest('button').id!=='store-selector-trigger'); if(!e) return 'none'; e.closest('button').click(); return 'ok'; }" >/dev/null 2>&1
playwright-cli -s=$S click 'button:text-is("Apply")' >/dev/null 2>&1; sleep 8
# the history row ending on END, e.g. "Oct 05–11, 2026" or "Sep 28–Oct 11, 2026"
ROW=$(playwright-cli -s=$S eval "() => { const re=new RegExp('–(${MON} )?0?${DAY}, \\\\d{4}\$'); const all=Array.from(document.querySelectorAll('td, [role=cell], div, span, p')).filter(x=>x.children.length===0); const r=all.find(x=>/^[A-Z][a-z]{2} \d\d–/.test(x.innerText.trim()) && re.test(x.innerText.trim()) && (!new RegExp('^${MON}').test(x.innerText.trim()) || true)); if(!r) return 'none'; const lbl=r.innerText.trim(); r.click(); return lbl; }" 2>&1 | res | tr -d '"')
[ "$ROW" = none ] && { echo "{\"store\":$(node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$STORE"),\"error\":\"no history row ending $END\"}"; exit 1; }
sleep 8
playwright-cli -s=$S click 'text=Expand all' >/dev/null 2>&1; sleep 3
playwright-cli -s=$S eval "() => {
  const t = document.body.innerText; const b = t.slice(t.indexOf('Total payout'), t.indexOf('Transactions'));
  const L = b.split('\n').map(x => x.trim()).filter(Boolean);
  const n = s => { const neg = /^-/.test(s); return (neg ? -1 : 1) * +s.replace(/[^\d.]/g, ''); };
  const pairs = []; for (let i = 0; i < L.length - 1; i++) if (/^-?\\\$[\d,]+\.\d\d$/.test(L[i + 1]) && !/^-?\\\$/.test(L[i])) pairs.push([L[i], n(L[i + 1])]);
  const sec = {}; let cur = null; const tops = ['Gross Sales', 'Marketing', 'Uber Fees', 'Amendments', 'Total payout'];
  for (const [k, v] of pairs) { if (tops.includes(k)) { cur = k; if (!(k in sec)) sec[k] = { total: v, items: [] }; continue; } if (cur) sec[cur].items.push([k, v]); }
  const sum = (s, f) => ((sec[s] || { items: [] }).items.filter(([k]) => f(k)).reduce((a, [, v]) => a + v, 0));
  const r2 = x => Math.round(x * 100) / 100;
  const earnings = sum('Gross Sales', k => /^Sales \(excl\. tax\)$/i.test(k));
  const mkTax = sum('Marketing', k => /^Tax on/i.test(k));
  const mkIncl = sum('Marketing', k => /\(incl\. tax\)$/i.test(k));
  const marketing = r2(-((sec.Marketing || { total: 0 }).total - mkTax));
  const fees = r2(-((sec['Uber Fees'] || { total: 0 }).total));
  const nc = r2(sum('Amendments', k => /chargebacks \(excl\. tax\)$/i.test(k)));
  const payout = (sec['Total payout'] || {}).total;
  const head = (t.match(/Payouts\n(.+)\n(.+?) · (.+)\n/) || []);
  return JSON.stringify({ store: head[2] || null, period: head[3] || null, row: '$ROW', payout, earnings: r2(earnings), marketing, fees, nc, other: r2(payout - (earnings - marketing - fees + nc)), url: location.href, sections: sec });
}" 2>&1 | res

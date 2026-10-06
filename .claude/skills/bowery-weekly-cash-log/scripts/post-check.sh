#!/bin/bash
# Enter one manual check as a Bank Expense on the store's operating account, attach the log, check it. Does not approve.
# usage: post-check.sh <session> <store> <check date M/D/YYYY> <check number> <amount> <payee> <invoice #> <GL number e.g. 510-04> <pdf path>
# Prints the vendor or Paid To used, the save reply, then MATCH or the fields that differ. Exits nonzero on any step that does not land.
set -u
S="$1"; ST="$2"; DT="$3"; NO="MC$4"; AMT="$5"; PAYEE="$6"; INV="$7"; GL="$8"; PDF="$9"
D=$(dirname "$0"); SK="$D/../.."
R365=https://bowerygroup.restaurant365.com
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
ev() { playwright-cli -s=$S eval "$1" 2>&1 | res; }
case "$ST" in
  Cookshop) LOC='200 - Cookshop'; BANK='100-10 - Cash - Cookshop Operating (4360)';;
  Shuka) LOC='400 - Shuka'; BANK='100-03 - Cash - Shuka Op / Payroll (2636)';;
  "Rosie's") LOC='500 - Rosie’s'; BANK="100-05 - Cash - Rosie's Operating (8778)";;
  Shukette) LOC='600 - Shukette'; BANK='100-06 - Cash - Shukette Op/Pay (2502)';;
  "Vic's") LOC='700 - Vic’s'; BANK="100-08 - Cash - Vic's Op / Payroll (9807)";;
  *) echo "STOP: unknown store $ST"; exit 1;;
esac
MEMO="Inv $INV"; [ -n "$INV" ] || MEMO=""
CMT=$(echo "$PAYEE $MEMO" | sed 's/ *$//')
q() { node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"; }

playwright-cli -s=$S tab-new "$R365/#/form/BankExpenseForm/00000000-0000-0000-0000-000000000000" >/dev/null 2>&1; sleep 18

# header widgets share ids with their wrappers; take the input
W="const w = id => jQuery('input[data-role=combobox]').filter((i,e)=>e.id===id).data('kendoComboBox'); const sleep = n => new Promise(r => setTimeout(r, n));"
OUT=$(ev "async () => { $W
  const pick = async (id, test) => { const k = w(id), t = k.options.dataTextField; const it = k.dataSource.data().find(d => test(d[t]));
    if (!it) return null; k.value(it[k.options.dataValueField]); k.trigger('change'); await sleep(3000); return k.text(); };
  const loc = await pick('bankExpenseLocation', s => s === $(q "$LOC"));
  if (!loc) return 'STOP: no location';
  if (!await pick('bankExpenseCheckingAccount', s => s === $(q "$BANK"))) return 'STOP: no account $BANK';
  // vendor only on one clear match; otherwise the payee goes in Paid To
  const norm = s => s.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\b(INC|LLC|CORP|CO|LTD|THE)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const v = w('vendor'), vt = v.options.dataTextField, want = norm($(q "$PAYEE"));
  v.search($(q "$PAYEE").split(' ')[0]); await sleep(3000);
  const hits = v.dataSource.data().filter(d => norm(d[vt]) === want);
  let who;
  if (hits.length === 1) { v.value(hits[0][v.options.dataValueField]); v.trigger('change'); await sleep(3000); who = 'vendor ' + v.text(); }
  else { v.value(''); v.trigger('change'); who = 'paid to ' + $(q "$PAYEE") + ' (' + hits.length + ' vendor matches)'; }
  const a = w('newRowAccountInput'), at = a.options.dataTextField;
  const acct = a.dataSource.data().find(d => d[at].indexOf($(q "$GL ")) === 0);
  if (!acct) return 'STOP: no account $GL';
  a.value(acct[a.options.dataValueField]); a.trigger('change');
  const d = jQuery('#bankExpenseDate').data('kendoDatePicker'); d.value(new Date($(q "$DT"))); d.trigger('change');
  return who + ' | line ' + a.text(); }" | tr -d '"')
echo "$OUT"; echo "$OUT" | grep -q STOP && exit 1
# typed fields need real input events
echo "$OUT" | grep -q '^paid to' && playwright-cli -s=$S fill '#bankExpensePayee' "$PAYEE" >/dev/null 2>&1
playwright-cli -s=$S fill '#bankExpenseNumber' "$NO" >/dev/null 2>&1
playwright-cli -s=$S fill '#bankExpenseComment' "$MEMO" >/dev/null 2>&1
playwright-cli -s=$S fill '#bankExpenseAmount' "$AMT" >/dev/null 2>&1
playwright-cli -s=$S fill '#newRowAmountInput' "$AMT" >/dev/null 2>&1
playwright-cli -s=$S fill 'input[name=newRowAmountInput] >> xpath=following::input[1]' "$CMT" >/dev/null 2>&1
playwright-cli -s=$S click 'button:text-is("Add")' >/dev/null 2>&1; sleep 2

SAVE=$(bash "$SK/danny-coops-payroll/scripts/save.sh" $S); echo "save $SAVE"
ID=$(echo "$SAVE" | grep -oE '^\[\["1","[0-9a-f-]{36}"' | grep -oE '[0-9a-f-]{36}')
[ -n "$ID" ] || exit 1
echo "id $ID"

open() { playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "$R365/#/form/BankExpenseForm/$ID" >/dev/null 2>&1; sleep 18; }
open
cp "$PDF" . && B=$(basename "$PDF")
playwright-cli -s=$S click 'button:has-text("Upload File")' >/dev/null 2>&1
playwright-cli -s=$S upload "$B" >/dev/null 2>&1; sleep 8
rm -f "$B"
open

CHK=$(ev "() => { const g = jQuery('[data-role=grid]').map((i,e)=>jQuery(e).data('kendoGrid')).get().find(k => k && k.dataSource.data().length);
  const rows = g ? g.dataSource.data().toJSON() : []; const bad = [];
  const eq = (n, got, want) => { if (String(got).trim() !== String(want).trim()) bad.push(n + ' ' + got + ' != ' + want); };
  eq('number', jQuery('#bankExpenseNumber').val(), $(q "$NO"));
  eq('date', jQuery('#bankExpenseDate').val(), $(q "$DT"));
  eq('amount', (+jQuery('#bankExpenseAmount').val()).toFixed(2), (+$(q "$AMT")).toFixed(2));
  eq('account', jQuery('input[name=bankExpenseCheckingAccount_input]').val(), $(q "$BANK"));
  eq('lines', rows.length, 1);
  if (rows[0]) { eq('line account', String(rows[0].glAccount).slice(0, 7), $(q "$GL"));
    eq('line amount', (+rows[0].amount).toFixed(2), (+$(q "$AMT")).toFixed(2));
    eq('line location', String(rows[0].location).replace(/[‘’]/g, \"'\"), $(q "$LOC").replace(/[‘’]/g, \"'\")); }
  if (!jQuery('a[title]').filter((i,a) => a.title === $(q "$B")).length) bad.push('no attachment');
  return bad.length ? 'DIFF ' + bad.join('; ') : 'MATCH'; }" | tr -d '"')
echo "$CHK"
[ "$CHK" = MATCH ]

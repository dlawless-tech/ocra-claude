#!/bin/bash
# post-cc.sh <session> <date> <number> <amount> <paid to> <memo> <gl> <line comment>
set -u
S="$1"; DT="$2"; NO="$3"; AMT="$4"; PAYEE="$5"; MEMO="$6"; GL="$7"; CMT="$8"
SK=/c/Users/trici/ocra-claude/.claude/skills
R365=https://bowerygroup.restaurant365.com
LOC='200 - Cookshop'; BANK='202-01 - Chase Ink Plus card x8281 - Cookshop'
res() { sed -n '/### Result/,/### Ran Playwright/p' | sed '1d;$d'; }
ev() { playwright-cli -s=$S eval "$1" 2>&1 | res; }
q() { node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"; }
playwright-cli -s=$S goto about:blank >/dev/null 2>&1
playwright-cli -s=$S goto "$R365/#/form/BankExpenseForm/00000000-0000-0000-0000-000000000000" >/dev/null 2>&1; sleep 18
W="const w = id => jQuery('input[data-role=combobox]').filter((i,e)=>e.id===id).data('kendoComboBox'); const sleep = n => new Promise(r => setTimeout(r, n));"
OUT=$(ev "async () => { $W
  const pick = async (id, test) => { const k = w(id), t = k.options.dataTextField; const it = k.dataSource.data().find(d => test(d[t]));
    if (!it) return null; k.value(it[k.options.dataValueField]); k.trigger('change'); await sleep(3000); return k.text(); };
  if (!await pick('bankExpenseLocation', s => s === $(q "$LOC"))) return 'STOP: no location';
  if (!await pick('bankExpenseCheckingAccount', s => s === $(q "$BANK"))) return 'STOP: no bank';
  const a = w('newRowAccountInput'), at = a.options.dataTextField;
  const acct = a.dataSource.data().find(d => d[at].indexOf($(q "$GL ")) === 0);
  if (!acct) return 'STOP: no account';
  a.value(acct[a.options.dataValueField]); a.trigger('change');
  const d = jQuery('#bankExpenseDate').data('kendoDatePicker'); d.value(new Date($(q "$DT"))); d.trigger('change');
  return 'line ' + a.text(); }" | tr -d '"')
echo "$OUT"; echo "$OUT" | grep -q STOP && exit 1
playwright-cli -s=$S fill '#bankExpensePayee' "$PAYEE" >/dev/null 2>&1
playwright-cli -s=$S fill '#bankExpenseNumber' "$NO" >/dev/null 2>&1
playwright-cli -s=$S fill '#bankExpenseComment' "$MEMO" >/dev/null 2>&1
playwright-cli -s=$S fill '#bankExpenseAmount' "$AMT" >/dev/null 2>&1
playwright-cli -s=$S eval "$(sed s/AMT/$AMT/g amt.js)" >/dev/null 2>&1
playwright-cli -s=$S fill 'input[name=newRowAmountInput] >> xpath=following::input[1]' "$CMT" >/dev/null 2>&1
playwright-cli -s=$S click '.grid-add-row-button' >/dev/null 2>&1; sleep 2
SAVE=$(bash "$SK/danny-coops-payroll/scripts/save.sh" $S); echo "save $SAVE"
ID=$(echo "$SAVE" | grep -oE '^\[\["1","[0-9a-f-]{36}"' | grep -oE '[0-9a-f-]{36}')
[ -n "$ID" ] || exit 1
echo "id $ID"
playwright-cli -s=$S goto about:blank >/dev/null 2>&1; playwright-cli -s=$S goto "$R365/#/form/BankExpenseForm/$ID" >/dev/null 2>&1; sleep 18
ev "$(cat rd.js)"

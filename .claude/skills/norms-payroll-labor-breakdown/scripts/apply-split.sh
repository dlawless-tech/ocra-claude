#!/bin/bash
# Apply a build-split.js plan to the open journal entry. Does not save.
# usage: apply-split.sh <session> <plan.json>
# Deletes go through a real click on the row trash icon; dataSource.remove never reaches the save.
set -u
S="$1"; PLAN=$(cat "$2")
JS=$(mktemp); trap 'rm -f "$JS"' EXIT
cat > "$JS" <<'EOF'
async () => {
  const plan = __PLAN__;
  const ACCT = { '5241': ['4ba9fd76-46a4-4225-b66e-0c74b3cdda0c', '5241 - FOH Hourly'],
                 '5242': ['f9723d47-e05f-4901-8c14-64b460ef7615', '5242 - BOH Hourly'] };
  const g = jQuery('[data-role=grid]').toArray().map(e => jQuery(e).data('kendoGrid')).filter(Boolean)[0];
  const sc = angular.element(document.querySelector('#newRowButtonsContainer')).scope();
  const f = sc.gridOptions.journalEntryDetailsGrid.newRowForm;
  const log = [];
  const removeUids = plan.remove.map(i => g.dataSource.at(i).uid);
  for (const [i, a] of plan.repoint) { const m = g.dataSource.at(i); m.set('glAccountId', ACCT[a][0]); m.set('glAccount', ACCT[a][1]); }
  for (const [i, d, c] of plan.set) { const m = g.dataSource.at(i); m.set('debit', d); m.set('credit', c); }
  // add lands at the form's default 299; move it by copying the store line's location
  for (const a of plan.add) {
    const before = g.dataSource.total();
    const dd = f.GLAccountsKendoDropDownList; dd.value(ACCT['5241'][0]); dd.trigger('change');
    sc.$apply(() => { f.model.debit = String(a.debit); f.model.credit = '0'; f.model.comment = 'regular / overtime / meal penalty'; });
    sc.$apply(() => f.addRowToGrid());
    for (let t = 0; t < 40 && g.dataSource.total() === before; t++) await new Promise(r => setTimeout(r, 250));
    const n = g.dataSource.total();
    if (n !== before + 1) { log.push('add failed ' + a.loc); continue; }
    const m = g.dataSource.at(n - 1), src = g.dataSource.at(a.locRow);
    if (!/^5241/.test(m.glAccount) || Math.abs(m.debit - a.debit) > 0.004) { log.push('added wrong row ' + a.loc); continue; }
    m.set('locationId', src.locationId); m.set('location', src.location);
  }
  return JSON.stringify({ lines: g.dataSource.total(), log, remove: removeUids.join(' ') });
}
EOF
node -e 'const fs=require("fs");fs.writeFileSync(process.argv[1],fs.readFileSync(process.argv[1],"utf8").replace("__PLAN__",process.argv[2]))' "$JS" "$PLAN"
OUT=$(playwright-cli -s=$S eval "$(cat "$JS")" 2>&1 | sed -n '/### Result/,/### Ran/p' | sed -n '2p')
echo "$OUT"
for U in $(echo "$OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f-]{27}'); do
  playwright-cli -s=$S click "tr[data-uid=\"$U\"] .k-grid-delete" >/dev/null 2>&1 && echo "removed $U"
done

#!/bin/bash
# Rebuild the open, unapproved entry's lines to match lines.json. Does not save.
# usage: load-lines.sh <session> <lines.json>
# Existing rows are repointed in place, missing rows added through the new-row form,
# surplus rows deleted by a real trash click (dataSource.remove never reaches the save).
set -u
S="$1"; LINES=$(node -e 'process.stdout.write(JSON.stringify(require(require("path").resolve(process.argv[1])).lines))' "$2")
JS=$(mktemp); trap 'rm -f "$JS"' EXIT
cat > "$JS" <<'EOF'
async () => {
  const want = __LINES__;
  const g = jQuery('[data-role=grid]').toArray().map(e => jQuery(e).data('kendoGrid')).filter(Boolean)[0];
  if (!g) return JSON.stringify({ stop: 'no line grid' });
  const sc = angular.element(document.querySelector('#newRowButtonsContainer')).scope();
  const f = sc && sc.gridOptions.journalEntryDetailsGrid.newRowForm;
  const put = (m, w) => {
    m.set('glAccountId', w.glId); m.set('glAccount', w.gl);
    m.set('locationId', w.locId); m.set('location', w.loc);
    m.set('debit', w.side === 'debit' ? w.amount : 0); m.set('credit', w.side === 'credit' ? w.amount : 0);
    m.set('comment', w.comment);
  };
  const log = [], have = g.dataSource.total();
  for (let i = 0; i < Math.min(have, want.length); i++) put(g.dataSource.at(i), want[i]);
  const remove = [];
  for (let i = want.length; i < have; i++) remove.push(g.dataSource.at(i).uid);
  for (let i = have; i < want.length; i++) {
    if (!f) return JSON.stringify({ stop: 'no new-row form; is the entry approved?' });
    const w = want[i], before = g.dataSource.total();
    // form drops the add when amounts land before the GL change settles
    const dd = f.GLAccountsKendoDropDownList; dd.value(w.glId); dd.trigger('change');
    await new Promise(r => setTimeout(r, 1500));
    sc.$apply(() => { f.model.debit = w.side === 'debit' ? String(w.amount) : '0'; f.model.credit = w.side === 'credit' ? String(w.amount) : '0'; f.model.comment = w.comment; });
    await new Promise(r => setTimeout(r, 500));
    sc.$apply(() => f.addRowToGrid());
    for (let t = 0; t < 60 && g.dataSource.total() === before; t++) await new Promise(r => setTimeout(r, 250));
    if (g.dataSource.total() !== before + 1) { log.push('add failed ' + w.loc + ' ' + w.amount); continue; }
    put(g.dataSource.at(before), w);
  }
  return JSON.stringify({ lines: g.dataSource.total(), log, remove: remove.join(' ') });
}
EOF
node -e 'const fs=require("fs");fs.writeFileSync(process.argv[1],fs.readFileSync(process.argv[1],"utf8").replace("__LINES__",process.argv[2]))' "$JS" "$LINES"
OUT=$(playwright-cli -s=$S eval "$(cat "$JS")" 2>&1 | sed -n '/### Result/,/### Ran/p' | sed -n '2p')
echo "$OUT"
for U in $(echo "$OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f-]{27}'); do
  playwright-cli -s=$S click "tr[data-uid=\"$U\"] .k-grid-delete" >/dev/null 2>&1 && echo "removed $U"
done

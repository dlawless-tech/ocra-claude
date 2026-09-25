# Driving R365 with playwright-cli

R365 is a legacy Angular app whose grids sit inside nested iframes. Its failure mode is silence: a step that does nothing looks exactly like a step that worked, and the cost lands later as an empty or unbalanced journal entry. Every rule here was paid for that way.

## The grid ignores scripted clicks until it gets a real one

A freshly loaded journal entry ignores `element.click()` from `eval`. The cell never enters edit mode, the following `fill` finds no input, and the entry saves with every line at 0.00 while every command reports success.

One real `playwright-cli click` on any cell of the line grid wakes it. After that, `eval` clicks work for the rest of the page's life.

```bash
playwright-cli -s=$S click <cell-ref>    # wakes the grid
playwright-cli -s=$S press Escape
```

## Snapshots race the page and sometimes land in a file

`playwright-cli snapshot` has two behaviors that break ref extraction:

- On a large page it writes the YAML to `.playwright-cli/page-*.yml` and prints only a link, so grepping stdout finds nothing.
- Called too soon after load it captures a partial tree, often just the Theme Builder panel, missing the grid entirely.

Resolve the file if there is one, and retry with a reload before concluding the grid is absent:

```bash
snap() {  # snap <session> <outfile>
  playwright-cli -s=$1 snapshot > "$2" 2>&1
  F=$(grep -oE '[.]playwright-cli[\\/][A-Za-z0-9._-]+[.]yml' "$2" | head -1 | sed 's|\\\\|/|g')
  [ -n "$F" ] && [ -f "$F" ] && cat "$F" > "$2"
}
```

An empty grep result feeds `sed -n "$((LN-1))p"` a `-1`, which errors as an unknown option. Guard the lookup so the real cause is reported.

## Cells edit through input names

Typing keystrokes at a cell lands nowhere. Click the cell, then address the editor by name:

```bash
playwright-cli -s=$S click <cell-ref>
playwright-cli -s=$S fill 'input[name="credit"]' "1083.07"   # or input[name="debit"]
playwright-cli -s=$S press Tab
playwright-cli -s=$S press Escape
```

`input[name=...]` and `#id` selectors survive grid rerenders. Refs do not: every action reshuffles them and a committed cell edit renumbers the whole row, so re-snapshot for a fresh ref before each step.

Locate a row by its Comment text rather than by position. Row cells run `["", Account, Account, Debit, Credit, Comment, Location, Asset, ""]`, so from the comment index `i`, Debit is `i-2` and Credit is `i-1`.

## Quote every shell variable interpolated into JavaScript

A bare `$C` in an `eval` string expands to a naked identifier and throws a ReferenceError, which `eval` swallows when its output is discarded:

```bash
cells[i-($C==='debit'?2:1)].click()      # ReferenceError: credit is not defined
cells[i-('$C'==='debit'?2:1)].click()    # correct
```

Capture and check the result of every `eval` that performs an action. This one bug silently emptied 21 journal entries in a single run.

A value carrying an apostrophe closes the JS literal early, and a location or comment can carry one. Build the literal in `node` and emit `\x27` and `\x22` for the quotes, so it survives bash, the CLI argument, and JS:

```bash
jsq() { node -e 'const B=String.fromCharCode(92),Q=String.fromCharCode(39),D=String.fromCharCode(34);process.stdout.write(Q+JSON.stringify(process.argv[1]).slice(1,-1).split(B+D).join(B+"x22").split(Q).join(B+"x27")+Q)' "$1"; }
L=$(jsq "$COMMENT")                       # 'Vic\x27s fees'
playwright-cli -s=$S eval "() => cells.findIndex(c => c.innerText.trim() === $L)"
```

Keep that helper free of backslashes. Windows argv rules rewrite backslashes on the way into `node -e`, so a `"\\x27"` in the source silently arrives as `"\x27"` and the escaping turns into a no-op.

## Compare amounts numerically

R365 normalizes a field to two decimals on blur, so a read-back of `4.00` fails a string comparison against `4`, and `468.10` fails against `468.1`. Normalize both sides before comparing.

## Ribbon buttons are menu openers

Clicking `Save` or `Approve` commits nothing. Hover the `li` to open its submenu, then fire the item you want. Save through `Save`, which sits beside `Save and New` and `Save and Close`. Approve through `Approve and Close`, beside `Approve` and `Approve and New`.

The submenu item's `ng-click` sits on its `li`, not on the `a` inside it, and the anchor swallows the click. Clicking the anchor reports success and commits nothing. Call the handler on the `li`'s own scope, addressing the item by `data-testid`:

```bash
playwright-cli -s=$S hover '#Save > a'
playwright-cli -s=$S eval "() => { const li=document.querySelector('#Save li[data-testid=\"saveMenuItem\"]'); const sc=window.angular.element(li).scope(); sc.\$apply(() => sc.subMenu.handler()); return sc.subMenu.title; }"
```

The testids are `saveMenuItem`, `saveAndNewMenuItem`, `saveAndCloseMenuItem`, `approveMenuItem`, `approveAndNewMenuItem`, `approveAndCloseMenuItem`.

On the 9/12/2026 payroll entry, the scope handler for `approveAndCloseMenuItem` ran and approved nothing. A real click on the `li` itself, with the menu hovered open, approved and closed the tab:

```bash
playwright-cli -s=$S click '#Approve > a'
playwright-cli -s=$S click 'li[data-testid="approveAndCloseMenuItem"]'
```

On the 9/19/2026 UberEats entries, hovering `#Approve > a` left every item hidden and the item click timed out. A real click on the anchor opens the menu. An entry opened by its direct URL stays on screen reading Unapproved after a successful approve, so the page proves nothing. Read the `Transaction/Approve` response, which reads `"Successfully Approved."` with the entry's id, and confirm Approved on the All Transactions grid after `dataSource.read()`.

An Approved entry shows `Unapprove` on the ribbon in place of `Approve`. A real click on `#Unapprove > a` and then on `li[data-testid="unapproveMenuItem"]` unapproves it with no confirmation dialog, and the `Transaction/UnApprove` response reads `"They all have been unapproved successfully"`.

## Edit and Edit Complete change an approved entry in place

An Approved journal entry carries an **Edit** button above its line grid. A real click turns it into **Edit Complete** and makes the lines editable with the entry still Approved. Set the amounts through `model.set`, then a real click on Edit Complete saves by itself: the `SaveTransaction` body reads committed, and a reload shows the new amounts with the status still Approved. This skips the unapprove, save, and approve round trip. First used on the 9/24/2026 CC Fee Accrual corrections.

## A rejected save answers 200

`SaveTransaction` answers a rejected save with HTTP 200 and the reason in its body, and the form shows nothing at all. Read the body after every save:

```bash
playwright-cli -s=$S requests | grep SaveTransaction
playwright-cli -s=$S response-body <n>
```

A committed save reads `[["1","<transaction id>"," "],["1",""]]`. A rejected one reads `[["15","The following errors need to be corrected to save or approve this transaction: ..."]]`.

Confirm from the All Transactions grid as well, which reads the server. An entry whose save never landed still shows its old number, date, and amount there.

## Duplicate saves on click and drops the payroll dates

`Action > Duplicate` writes the copy to the server the moment it is clicked, so the new entry exists before anything has been filled in. It arrives numbered `NJ000xxxxx`, dated today, carrying the source entry's amounts.

It does not carry `journalEntryPayrollStartDate` or `journalEntryPayrollEndDate`, both required on a payroll entry. Fill them along with the date and number, and save once before editing lines. Leaving them blank rejects every save, and a whole entry's worth of line edits is lost on the next reload.

## Reach the grid document through nested iframes

The transactions grid lives two iframes deep. Walk the frame tree to find the document that holds it:

```js
const seen=[];
const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
walk(document);
const d = seen.find(x=>x.querySelector('input') && /Approval Status/.test(x.body.innerText||''));
```

## Read the grid from its data source

The Kendo data source carries every row including `TransactionId`, which beats scraping cells and gives direct entry URLs:

```js
const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
const dt = x => { const D=new Date(x.Date); return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0'); };
return g.dataSource.view()
  .filter(x => x.Number==='UberEats' && dt(x)==='2026-09-05')
  .map(x => ({loc:x.Location, id:x.TransactionId, status:x.ApprovalStatus, amt:x.Amount}));
```

`Date` comes back as a Date object, so format it rather than matching the raw string. With the ids in hand, open any entry directly:

```
https://norms.restaurant365.com/#/form/JournalEntryForm/<TransactionId>
```

That URL is what makes parallel workers practical, and it skips the whole filter and fire-the-onclick dance.

## Filtering the grid

Setting a filter input's value from `eval` does not trigger Kendo's filter. Set the value, then send a real Enter through `playwright-cli press` against that input's snapshot ref.

Filter inputs follow header order, and the column set varies between loads, so map them by reading the header row rather than assuming an index. An `Email` column appears in some loads and shifts everything after it.

To open an entry from the grid without an id, the Number cell holds `<font onclick="fireNumber(this)">`, so a plain click only selects the cell:

```bash
playwright-cli -s=$S eval "el => el.querySelector('font').click()" <cell-ref>
playwright-cli -s=$S tab-list
playwright-cli -s=$S tab-select 1
```

## The GL report location filter

Click the Select All **checkbox element** to clear selections. Clicking its label text closes the popup with everything still selected. Then search the store name, check `<number> - <store>`, and click OK. The parameter reads the store name back when it took.

The dialog's own Run button sits in its footer beside the Default and Public checkboxes. The report opens in a new tab.

## Sessions bind to the working directory

`playwright-cli` keys its browsers to the directory the command runs in. A `cd` mid run makes every session unreachable with "The browser is not open". Keep one directory for a whole run, and give parallel workers distinct session names in that same directory.

## The report customize dialog takes no typed input

Reports open at `/react/reports-management/legacy/MyReports`, reached by clicking **Reports** on the home dashboard. Navigating straight to `/react/reports` renders a blank page.

Everything on that page lives one iframe down, so CSS selectors passed to `playwright-cli` never find it and every lookup has to walk the frame tree.

The report cards take about thirty seconds to appear, and while they load `contentDocument` walking reports only the Theme Builder frame. The accessibility snapshot sees the cards first, so use it to find the card's **Customize** button. A card holds its heading and its own Customize, and the Customize that reads first in the snapshot belongs to the card above it.

The dialog's parameter widgets refuse keyboard and refuse `fill`. A real click focuses the account input, and keystrokes still land nowhere; `fill` runs, and Angular's next digest restores the old text. Only the date textboxes accept `fill`, and only against a ref from a fresh snapshot.

Drive the rest through Angular instead. An **md-autocomplete** parameter carries an `r365options` controller on the isolate scope's parent, whose `querySearch` returns the real items:

```js
const el = d.querySelector('#input-23');            // the Account parameter
const ac = el.closest('md-autocomplete');
const o  = w.angular.element(ac).isolateScope().$parent.r365options;
const it = (await o.querySearch('104-04'))[0];
ac_scope.$parent.$apply(() => { o.selectedItem = it; o.searchText = it.display; o.selectedItemChange(it); });
```

A **button group** parameter (Subtotal By, Show Unapproved, Parent) renders through `ng-transclude`, so its buttons carry no `innerText` for a text lookup and the active one is marked by the `activeR365` class. The label span's nearest `section` is the group; `closest('li')` returns nothing. Find the group by its label span, then call the handler on the button's own scope:

```js
const sec = Array.from(d.querySelectorAll('span')).find(x => x.textContent.trim() === 'Subtotal By').closest('section');
const b   = Array.from(sec.querySelectorAll('button'))[1];   // None | Location | Company
const sc  = w.angular.element(b).scope();
sc.$apply(() => sc.buttonSelected(sc.valuePair, sc.param, {stopPropagation(){}, preventDefault(){}}));
```

Confirm a button group from the buttons, never from the parameter's hidden input. That input still reads `None` after Subtotal By has moved to Location. The button's own scope carries `valuePair.wanted`, and the active button carries the `activeR365` class; both report the truth.

The dialog's own **Run** button is the one whose `ng-click` is `runReport($event)`, inside `md-dialog` and labelled `exportMenu`. The cards behind the dialog carry their own Run buttons bound to `runReportClicked`, and clicking one of those runs the wrong report with default parameters.

Confirm every parameter took before running, since a silently ignored one produces a plausible report of the wrong thing.

## The rendered report is unreachable by frame walking

Run opens the report in a second tab at `/#/ReportViewer`, whose own frames often report a load error while the report itself renders fine. `contentDocument` walking finds nothing there.

Read the figures out of the accessibility snapshot instead, where every table cell survives:

```bash
grep -oE 'cell "[^"]*"' snapshot.txt | sed 's/^cell "//; s/"$//'
```

Cells arrive in row order, so a location's block runs from its name through its `Total ...` row.

## A full page load logs the session out

Opening `/react/accounting/legacy/AllTransactions` by url in an authenticated session has bounced to `identity.restaurant365.com`. Reach it by soft navigation from a loaded React page instead:

```bash
playwright-cli -s=$S eval "() => { history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); window.dispatchEvent(new PopStateEvent('popstate')); }"
```

Run that from a React route such as the home dashboard or My Reports. From a legacy `#/form/...` entry page it changes the url and never renders the grid, so the frame walk finds nothing.

`playwright-cli goto https://norms.restaurant365.com/#/form/JournalEntryForm/<id>` opens an entry and keeps the session, as on the 9/19 UberEats run and the 9/23/2026 Grubhub run across four sessions. If a goto ever lands on the login page, re-run the login script and fall back to firing the grid's Number cell `onclick`, which opens the entry in a second tab.

Writing `location.hash` inside the legacy Angular app logs it out the same way a page load does, so a route change there costs a fresh login and every unsaved edit on the page.

## Kendo's model.set reaches the line grid

`dataSource.at(i).set('debit', v)` writes through to the rendered cell and survives a save and reload. It needs no wake-up click and no per-cell edit, so a whole entry goes in as a handful of calls:

```js
const g = jQuery('[data-role=grid]').data('kendoGrid');
const m = g.dataSource.at(i);
m.set('debit', d); m.set('credit', c); m.set('comment', text);
```

Read the values back from `tbody` afterwards, and again after a reload. This is the fast path for amounts; the click-then-fill dance above is still the fallback when a set does not take.

## Adding a line through the new row form

The form above the line grid carries `newRowAccountField`, `newRowDebitInput`, `newRowCreditInput`, a comment textbox, a location button, and Add.

The account combobox ignores `fill`: Angular's next digest restores the old text and no popup opens. Click it, send real keystrokes, then pick from the list:

```bash
playwright-cli -s=$S click <ref>
playwright-cli -s=$S type "6060"
playwright-cli -s=$S press ArrowDown
playwright-cli -s=$S press Enter
```

Confirm it took by reading the hidden `input[name="newRowAccountField"]`, which holds the account's guid once selected.

The location button opens a checkbox list carrying the current selection. Check the wanted location and uncheck the default, then Escape. To move a line that already exists, copy `locationId` and `location` from a line that carries the wanted one.

The keystrokes can be skipped: the form's scope exposes `gridOptions.journalEntryDetailsGrid.newRowForm`. Set `GLAccountsKendoDropDownList.value(guid)` and trigger `change`, set `model.debit`, `model.credit`, and `model.comment` inside `$apply`, then call `addRowToGrid()`. The row lands at the form's default location. `norms-payroll-labor-breakdown/scripts/apply-split.sh` does this for a batch.

## Deleting a line

A real `playwright-cli click` on the row's `.k-grid-delete` trash icon deletes it, with no dialog on the payroll entry. Address it as `tr[data-uid="<uid>"] .k-grid-delete`, taking the uid from `dataSource.at(i).uid`.

`dataSource.remove(model)` drops the row from the grid and the save leaves it on the server. The save still reports success, so the reopened entry carries the row again and is out of balance by its amount.

## Shell quoting around eval scripts

Write every eval script to a file with a quoted heredoc (`<<'EOF'`) and pass it as `"$(cat file)"`. Building the same script through `node -e '...'` eats the single quotes inside it, so `$('[data-role=grid]')` arrives as `$([data-role=grid])` and throws.

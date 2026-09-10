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

## Compare amounts numerically

R365 normalizes a field to two decimals on blur, so a read-back of `4.00` fails a string comparison against `4`, and `468.10` fails against `468.1`. Normalize both sides before comparing.

## Ribbon buttons are menu openers

Clicking `Save` or `Approve` commits nothing. Hover the `li`, then click the item from the submenu. Save through `Save`, which sits beside `Save and New` and `Save and Close`. Approve through `Approve and Close`, beside `Approve` and `Approve and New`:

```bash
playwright-cli -s=$S hover '#Save > a'
playwright-cli -s=$S eval "() => { const li=document.getElementById('Save'); const items=Array.from(li.querySelectorAll('ul li a, ul li button')).filter(a=>a.innerText.trim()==='Save'); items[items.length-1].click(); return 'clicked'; }"
```

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
https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/<TransactionId>
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

The dialog's parameter widgets refuse keyboard and refuse `fill`. A real click focuses the account input, and keystrokes still land nowhere; `fill` runs, and Angular's next digest restores the old text. Only the date textboxes accept `fill`, and only against a ref from a fresh snapshot.

Drive the rest through Angular instead. An **md-autocomplete** parameter carries an `r365options` controller on the isolate scope's parent, whose `querySearch` returns the real items:

```js
const el = d.querySelector('#input-23');            // the Account parameter
const ac = el.closest('md-autocomplete');
const o  = w.angular.element(ac).isolateScope().$parent.r365options;
const it = (await o.querySearch('104-04'))[0];
ac_scope.$parent.$apply(() => { o.selectedItem = it; o.searchText = it.display; o.selectedItemChange(it); });
```

A **button group** parameter (Subtotal By, Show Unapproved, Parent) renders through `ng-transclude`, so its buttons carry no `innerText` for a text lookup and the active one is marked by the `activeR365` class. Find the group by its label span, then call the handler on the button's own scope:

```js
const sec = Array.from(d.querySelectorAll('span')).find(x => x.textContent.trim() === 'Subtotal By').closest('section');
const b   = Array.from(sec.querySelectorAll('button'))[1];   // None | Location | Company
const sc  = w.angular.element(b).scope();
sc.$apply(() => sc.buttonSelected(sc.valuePair, sc.param, {stopPropagation(){}, preventDefault(){}}));
```

The dialog's own **Run** button is the one whose `ng-click` is `runReport($event)`, inside `md-dialog` and labelled `exportMenu`. The cards behind the dialog carry their own Run buttons bound to `runReportClicked`, and clicking one of those runs the wrong report with default parameters.

Confirm every parameter took before running, since a silently ignored one produces a plausible report of the wrong thing.

## The rendered report is unreachable by frame walking

Run opens the report in a second tab at `/#/ReportViewer`, whose own frames often report a load error while the report itself renders fine. `contentDocument` walking finds nothing there.

Read the figures out of the accessibility snapshot instead, where every table cell survives:

```bash
grep -oE 'cell "[^"]*"' snapshot.txt | sed 's/^cell "//; s/"$//'
```

Cells arrive in row order, so a location's block runs from its name through its `Total ...` row.

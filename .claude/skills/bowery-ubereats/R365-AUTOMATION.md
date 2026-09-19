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

`scripts/snapshot.sh <session> <outfile>` resolves the link, and takes an empty session name for the default browser. Retry with a reload before concluding the grid is absent.

Convert the link's backslashes with `tr '\134' '/'`. MSYS rewrites a literal backslash on the way into an argument, so a `sed` substitution against one errors out and leaves the path empty, which downgrades every snapshot on a large page to a bare link.

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

A value carrying an apostrophe closes the JS literal early, and a Bowery location or comment can carry one. Build the literal in `node` and emit `\x27` and `\x22` for the quotes, so it survives bash, the CLI argument, and JS:

```bash
jsq() { node -e 'const B=String.fromCharCode(92),Q=String.fromCharCode(39),D=String.fromCharCode(34);process.stdout.write(Q+JSON.stringify(process.argv[1]).slice(1,-1).split(B+D).join(B+"x22").split(Q).join(B+"x27")+Q)' "$1"; }
L=$(jsq "$COMMENT")                       # 'Vic\x27s fees'
playwright-cli -s=$S eval "() => cells.findIndex(c => c.innerText.trim() === $L)"
```

Keep that helper free of backslashes. Windows argv rules rewrite backslashes on the way into `node -e`, so a `"\\x27"` in the source silently arrives as `"\x27"` and the escaping turns into a no-op.

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

Filter the data source directly. `dataSource.filter` triggers Kendo's own read, so the grid reloads server side and `view()` comes back holding only the matching rows. This skips the input, the header mapping and the keystroke entirely:

```js
g.dataSource.filter({field:'Number', operator:'contains', value:'Door'});
await new Promise(r=>setTimeout(r,6000));   // the read is async; view() is stale until it lands
return g.dataSource.view().map(x => ({loc:x.Location, id:x.TransactionId, status:x.ApprovalStatus}));
```

The default page holds 250 rows, so an unfiltered `view()` silently omits anything past the first page. Filter before reading rather than scanning what happens to be loaded.

Driving the filter input instead is the fallback. Setting its value from `eval` does not trigger Kendo's filter: set the value, then send a real Enter through `playwright-cli press` against that input's snapshot ref. Filter inputs follow header order, and the column set varies between loads, so map them by reading the header row rather than assuming an index. An `Email` column appears in some loads and shifts everything after it.

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

## Reach app pages by clicking the dashboard nav

`playwright-cli open` on a `/react/...` URL lands on the login page and drops the session, whether or not it was authenticated a moment earlier. Clicking the same href from the home dashboard works. Land on `/react/home?dashboard=operationsHome`, snapshot, and click the nav link:

```bash
R=$(grep -B2 '/url: /react/accounting/legacy/AllTransactions' snap.txt | grep -oE 'link .ref=f[0-9]+e[0-9]+.' | grep -oE 'f[0-9]+e[0-9]+')
playwright-cli -s=$S click $R    # Reports sits at /react/reports-management/legacy/MyReports
```

The nav renders about 25 seconds after login, and Accounting and Reports take another 30 to settle. The journal entry hash route is the exception and `goto` reaches it directly:

```
https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/<TransactionId>
```

Expect to re-authenticate mid run. A session can come back logged out after a long report render or an `Approve and Close`, so check `location.hostname` against `bowerygroup.restaurant365.com` before trusting a page, and re-run `scripts/r365-login.sh <session>`. Test the hostname rather than the href: the login page carries the app host inside its own `ReturnUrl`, so an href test reports a logged-out session as authenticated.

## The report customize dialog takes no typed input

Everything on My Reports lives one iframe down, so CSS selectors passed to `playwright-cli` never find it and every lookup has to walk the frame tree. The dialog's document is the one where `querySelector('md-dialog')` hits. An `eval` that skips the walk runs against the top document and reports every parameter as absent rather than erroring.

The report cards take about thirty seconds to appear, and while they load `contentDocument` walking reports only the Theme Builder frame. The accessibility snapshot sees the cards first, so use it to find the card's **Customize** button. A card reads as its heading followed by its own Run and Customize, so the card's Customize is the first one *after* its heading. Searching upward from the heading lands on the previous card's Customize and silently customizes the wrong report. The same headings repeat under Recent and Favorites, so either match works.

The dialog's parameter widgets refuse keyboard and refuse `fill`. A real click focuses the account input, and keystrokes still land nowhere; `fill` runs, and Angular's next digest restores the old text. Only the date textboxes accept `fill`, and only against a ref from a fresh snapshot.

The `input-NN` ids are assigned per render and shift between loads, so find every parameter by the value it is showing rather than by id. Dump `md-dialog input` as `{id, value, placeholder}` first: the Account parameter is the one holding an account string, the location filter holds `All Locations`, and the Start and End textboxes are the two carrying a placeholder.

Drive the rest through Angular instead. An **md-autocomplete** parameter carries an `r365options` controller on the isolate scope's parent, whose `querySearch` returns the real items:

```js
const el = Array.from(d.querySelectorAll('md-dialog input')).find(x => /^\d{3}-\d{2} - /.test(x.value));
const ac = el.closest('md-autocomplete');
const sc = w.angular.element(ac).isolateScope();
const o  = sc.$parent.r365options;
const it = (await o.querySearch('104-04'))[0];
sc.$parent.$apply(() => { o.selectedItem = it; o.searchText = it.display; o.selectedItemChange(it); });
```

`querySearch` is async, so await it, and read the input's value back afterwards to confirm the pick landed.

A **button group** parameter (Subtotal By, Show Unapproved, Parent) renders through `ng-transclude`, so its buttons carry no `innerText` for a text lookup. The label span's nearest `section` is the group; `closest('li')` returns nothing. Find the group by its label span, then call the handler on the button's own scope:

```js
const sec = Array.from(d.querySelectorAll('span')).find(x => x.textContent.trim() === 'Subtotal By').closest('section');
const b   = Array.from(sec.querySelectorAll('button')).find(x => w.angular.element(x).scope().valuePair.display === 'Location');
const sc  = w.angular.element(b).scope();
sc.$apply(() => sc.buttonSelected(sc.valuePair, sc.param, {stopPropagation(){}, preventDefault(){}}));
```

Each button's scope carries a `valuePair` of `{display, value, wanted}`: `display` is the label to match on, and `wanted` is the boolean holding the selection. Match on `display`, since position varies and `wanted` is a flag rather than a name.

Confirm a button group from `valuePair.wanted` alone. The parameter's hidden input still reads `None` after Subtotal By has moved to Location, and the `activeR365` class lags a digest, so both buttons can read active on the call that follows the click.

The dialog's own **Run** button is the one whose `ng-click` is `runReport($event)`, inside `md-dialog` and labelled `exportMenu`. The cards behind the dialog carry their own Run buttons bound to `runReportClicked`, and clicking one of those runs the wrong report with default parameters.

Confirm every parameter took before running, since a silently ignored one produces a plausible report of the wrong thing.

## The rendered report is unreachable by frame walking

Run opens the report in a second tab at `/#/ReportViewer`, whose own frames often report a load error while the report itself renders fine. `contentDocument` walking finds nothing there.

Read the figures out of the accessibility snapshot instead, where every table cell survives:

```bash
grep -oE 'cell "[^"]*"' snapshot.txt | sed 's/^cell "//; s/"$//'
```

Cells arrive in row order, so a location's block runs from its name through its `Total ...` row.

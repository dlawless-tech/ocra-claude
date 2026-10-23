---
name: norms-weekly-cc-fees-accrual
description: Post the weekly credit card fee accrual into NORMS Restaurant365 through Claude in Chrome, one journal entry per store at 1.75% of that store's net sales. Use when asked to fill, balance, or approve the NORMS CC Fee Accrual entries in R365, or to check a week's accrual against the Wkly P&L - Location Side by Side report.
---

# Weekly CC fee accrual into the NORMS journal entries

Each store accrues **1.75% of its Total Net Sales** for the operational week. Read every store's net sales from one saved P&L, compute the accruals, then fill the 24 entries R365 already holds for that week.

You drive the user's own Chrome through the Claude in Chrome tools: `navigate`, `find`, `read_page`, `get_page_text`, `computer`, `javascript_tool`, and the tab tools. Start with `tabs_context_mcp`, then work in a new tab on `https://norms.restaurant365.com/react/accounting`. The user signs in to R365 themselves. When a page lands on `identity.restaurant365.com` or a login form, stop and ask them to sign in, then carry on from the step you were on.

## How R365 behaves

R365 is a legacy Angular app whose grids sit inside iframes. Its failure mode is silence: a step that did nothing looks exactly like a step that worked, and the cost lands later as an empty or unbalanced entry. So:

- **Real click** means a `computer` `left_click` on a ref from `find` or `read_page`. Buttons marked for a real click ignore a scripted `element.click()` from `javascript_tool`.
- **Read back** every write. Compare amounts numerically, since R365 shows `4.00` for `4` and `468.10` for `468.1`.
- **Soft navigate** between React pages. Loading `/react/accounting/legacy/AllTransactions` by URL can log the session out. From a React page such as the home dashboard or My Reports, run in `javascript_tool`:

  ```js
  history.pushState({}, '', '/react/accounting/legacy/AllTransactions'); window.dispatchEvent(new PopStateEvent('popstate'));
  ```

  From a legacy `#/form/...` entry page this changes the URL and renders nothing, so `navigate` back to `/react/accounting` first. Opening an entry with `navigate` to `https://norms.restaurant365.com/#/form/JournalEntryForm/<TransactionId>` keeps the session.

## The week

The NORMS operational week runs **Sunday to Saturday**, and the entry is dated the **Saturday that ends it**. The week of 9/13 through 9/19/2026 posts to entries dated 9/19/2026.

Run it once every store's daily sales for the week are in. The 9/19/2026 entries were filled on the morning of 9/22, before sales days landed for Hollywood, Ontario, South Torrance, Van Nuys, and West Covina, and those five posted 15% to 34% short until they were corrected on 9/24.

## Step 1: net sales from the Wkly P&L

Click **Reports** on the home dashboard to reach My Reports; going to a reports URL directly renders a blank page. The report cards take about thirty seconds to appear. On the **Profit and Loss** card, open **View** and real-click the **Wkly P&L - Location Side by Side** button in the dialog. Clicking its label text leaves the card on System View; the card's combobox reads the view's name when it took.

Open the card's **Customize**. The view is saved as Location Side by Side - Week, operational calendar, As Of **Previous**, filtered to the legal entity Norms Restaurants, LLC. Previous means the last completed operational week. For any other week, click **As Of** and pick `Week End <the Saturday>`; the combobox beside it reads the week once it took.

Run it with the dialog's own **Run** button, in the `md-dialog` footer beside the Default and Public checkboxes. The cards behind the dialog carry Run buttons of their own that run the wrong report with default parameters. The report opens in a second tab at `/#/ReportViewer`; find it with `tabs_context_mcp`.

Read the report with `get_page_text`, or `read_page` if the text comes back empty. The frames there report a load error while the report renders fine, so `javascript_tool` frame walking finds nothing. **Confirm the header reads `Week Ending <the Saturday>`** before using a figure. The location columns run Anaheim through Whittier, then **Norms Support Center** at 0.00, then Total, and the `Total Net Sales` row carries one figure per column in that order. Support Center carries no sales and no entry, which leaves 24 stores.

## Step 2: the accruals

```
accrual = round(Total Net Sales x 0.0175, 2)
```

Round half up to the cent, computing in cents so floating point cannot tip a half cent: `Math.round(net * 1.75) / 100`. This reproduces every store on the 9/12/2026 week to the penny. The estate total runs a few cents off the report's Total column times 1.75%, because each store rounds on its own.

## Step 3: the entries

Soft navigate to All Transactions. The grid lives in a nested iframe and pages on the server, so filter it through its data source. In `javascript_tool`:

```js
const seen = []; const walk = d => { seen.push(d); for (const f of d.querySelectorAll('iframe')) { try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} } }; walk(document);
const d = seen.find(x => x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.pageSize(1000);
g.dataSource.filter({logic: 'and', filters: [{field: 'Number', operator: 'contains', value: 'CC Fee'}]});
'filtered'
```

If `d` is undefined the grid has not loaded yet; wait a few seconds and retry. Then, in a second call with the same frame walk, read the rows for the Saturday and the Saturday before it (10/24 and 10/17 shown):

```js
const dt = x => { const D = new Date(x.Date); return D.getFullYear() + '-' + String(D.getMonth() + 1).padStart(2, '0') + '-' + String(D.getDate()).padStart(2, '0'); };
JSON.stringify(g.dataSource.view().filter(x => ['2026-10-24', '2026-10-17'].includes(dt(x)))
  .map(x => ({date: dt(x), loc: x.Location, id: x.TransactionId, status: x.ApprovalStatus, amt: x.Amount})));
```

Each week carries **24 Journal Entries numbered `CC Fee Accrual`**, one per store, comment `1.75%  of sales weekly`. Each holds two lines at its own location:

```
debit   5510 - Credit Card Fees          accrual
credit  2016 - Accrued Credit Card Fees  accrual
```

The entries exist before the week closes, either Approved or Unapproved at 0.00. Each row's `status` picks its path in Step 4. If the Saturday has fewer than 24, report which stores are missing and post the ones that are there; building new entries is the user's call.

Compare each store's accrual with its prior-week `amt`. A store more than about 10% below it often has a missing sales day, and posting it bakes the shortfall in. List those stores with both figures and ask the user whether to post them or wait. A store already Approved at its accrual is done; skip it.

## Step 4: posting

Open each entry by its direct URL and wait until the line grid holds two rows (`jQuery('[data-role=grid]').data('kendoGrid').dataSource.data().length`). Then install a recorder for the server's answers, since a rejected save answers HTTP 200 with the reason in its body and the form shows nothing:

```js
window.__r365 = [];
const o = XMLHttpRequest.prototype.open, s = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function (m, u) { this.__u = u; return o.apply(this, arguments); };
XMLHttpRequest.prototype.send = function () { this.addEventListener('load', () => { if (/SaveTransaction|Transaction\/Approve/.test(this.__u)) window.__r365.push({url: this.__u, body: String(this.responseText).slice(0, 300)}); }); return s.apply(this, arguments); };
'recording'
```

Read `JSON.stringify(window.__r365)` after each save or approve. A committed save reads `[["1","<TransactionId>"," "],["1",""]]`; a rejected one reads `[["15","The following errors need to be corrected ..."]]`. An approve reads `"Successfully Approved."`. The recorder resets on reload, so install it again on each entry.

Both paths set the lines through the line grid's Kendo model, finding each line by its account, with `amt` as the accrual:

```js
const g = jQuery('[data-role=grid]').data('kendoGrid'); let n = 0;
g.dataSource.data().forEach(m => {
  const a = String(m.glAccount || '');
  if (/^5510 /.test(a)) { m.set('debit', amt); m.set('credit', 0); n++; }
  if (/^2016 /.test(a)) { m.set('credit', amt); m.set('debit', 0); n++; }
});
n
```

It returns 2 when both lines took.

### An Approved entry

It edits in place without unapproving.

1. Real-click the **Edit** button above the line grid (`button.btn-default` reading Edit). It turns into **Edit Complete**; confirm the text changed.
2. Set both lines through the Kendo model.
3. Real-click **Edit Complete**. It saves on its own; read the recorder for the committed body.

### An Unapproved entry

It opens with the lines already editable and the button above the grid already reading **Edit Complete**, so skip the Edit click.

1. Set both lines through the Kendo model.
2. Save through the ribbon. The ribbon's **Save** only opens a submenu, and the submenu's anchor swallows clicks, so fire the item's handler on its `li` scope:

   ```js
   const li = document.querySelector('#Save li[data-testid="saveMenuItem"]'); const sc = angular.element(li).scope(); sc.$apply(() => sc.subMenu.handler()); sc.subMenu.title
   ```

   Read the recorder for the committed body.
3. Approve with a real click on `#Approve > a`, then a real click on the menu item `li[data-testid="approveMenuItem"]`. The page keeps reading Unapproved after a successful approve, so trust the recorder's `"Successfully Approved."`.

An entry is done, on either path, when you reload it by the same URL and both lines read the accrual. Move to the next store; one that fails a step gets reported with the failing step while the rest carry on.

## Verifying the run

Back on All Transactions, run `g.dataSource.read()`, refilter, and check every row for the Saturday: `status` Approved and `amt` equal to that store's accrual. The grid reads the server, so it is the record of what posted.

Report a table of store, Total Net Sales, accrual, and posted amount, with the estate total, and list any store that did not post, was held for missing sales, or was missing an entry.

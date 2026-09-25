---
name: norms-weekly-chainwide-advertising-accrual
description: Post the weekly chainwide advertising accrual into NORMS Restaurant365, one combined journal entry across every store at 2.8% of each store's net sales. Use when asked to fill, balance, or approve the NORMS Chainwide Advertising entry in R365, or to check a week's advertising accrual against the Wkly P&L - Location Side by Side report.
---

# Weekly chainwide advertising accrual into the NORMS journal entry

Each store accrues **2.8% of its Total Net Sales** for the operational week, and every store's accrual sits on **one** journal entry. Read net sales from one saved P&L, compute the accruals, then fill that week's entry.

Session, from one working directory for the whole run:

```bash
../norms-grubhub/scripts/r365-login.sh r365
```

Credentials live in `~/.claude/norms-credentials.md`, which the login script reads. Ask the human only when they are missing or rejected.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting any of this. It carries the frame walk, the soft navigation to All Transactions, the report dialog, the ribbon menus, and the save and approve checks this skill leans on.

## The week

The NORMS operational week runs **Sunday to Saturday**, and the entry is dated the **Saturday that ends it**. The week of 9/13 through 9/19/2026 posts to the entry dated 9/19/2026.

Run it once every store's daily sales for the week are in. On the 9/19/2026 week, Hollywood, Ontario, South Torrance, Van Nuys, and West Covina posted 15% to 34% below what the report read on 9/24, the same five stores the CC fee accrual posted short, because their sales days landed after the entry was filled.

## Step 1: net sales from the Wkly P&L

Reports sits on the home dashboard; click it to reach My Reports. On the **Profit and Loss** card, open **View** and click the **Wkly P&L - Location Side by Side** button in the dialog. The card's combobox reads that name when it took.

The view is saved as Location Side by Side - Week, operational calendar, As Of **Previous**, filtered to the legal entity Norms Restaurants, LLC. Open **Customize** and run it from the dialog's own Run button (`runReport($event)`, see the automation notes) with every parameter as saved. The report opens in a second tab at `/#/ReportViewer`; `tab-select 1` before reading it.

Previous means the last completed operational week, so a run on 9/24/2026 reads Week Ending 09/19/2026. **Confirm the header reads `Week Ending <the Saturday>`** before using a figure.

Read the figures from the accessibility snapshot. The location headers run Anaheim through Whittier, then `Total`, and the `Total Net Sales` row carries one link per column in the same order:

```bash
grep -oE 'cell "[^"]*"' rep.txt | sed 's/^cell "//; s/"$//' | sed -n '/^Anaheim$/,/^Total$/p' > locs.txt
awk '/cell "Total Net Sales"/{on=1;next} on && /cell "[A-Z]/{exit} on' rep.txt | grep -oE 'link "[^"]*"' | sed 's/link "//;s/"//' > ns.txt
paste locs.txt ns.txt
```

Both files hold 26 lines: 24 stores, **Norms Support Center** at 0.00, and Total. Support Center carries no sales and no debit line.

## Step 2: the accruals

```
accrual = round(Total Net Sales x 0.028, 2)
offset  = sum of the 24 accruals
```

Round half up to the cent, in cents: `Math.round(net * 2.8) / 100`. On the 9/19/2026 week this reproduced 17 of the 24 posted lines to the penny. Five were the late-sales stores above; Inglewood and Rialto posted 0.01 above the computed figure, with no cause found. The entry was corrected to the computed figures on 9/24/2026 and reads 54,145.96.

Before posting, scan for a store whose net sales sit far below its prior week's line divided by 0.028. A drop of more than about 10% often means a missing sales day. Report the store and ask whether to wait.

## Step 3: the entry

Soft navigate to All Transactions and filter the grid through its data source. The grid pages on the server, so a filter on the loaded page misses entries:

```js
g.dataSource.pageSize(1000);
g.dataSource.filter({logic: 'and', filters: [{field: 'Number', operator: 'contains', value: 'Chainwide'}]});
```

Each week carries **one Journal Entry numbered `Chainwide Advertising`**, name `Journal Entry - Chainwide Advertising`, header location `299 - Norms Support Center`, 25 lines:

```
debit   5410 - Chainwide Advertising   accrual     one line per store, at that store's location
credit  6699 - Marketing Offset        offset      299 - Norms Support Center
```

Line comments are blank. The entry has posted weekly since 7/18/2026; the 7/11/2026 entry is a larger catch-up and reads differently.

If no entry carries the Saturday's date, open the prior week's and use **Action > Duplicate**. The copy is written to the server on click, numbered `NJ000xxxxx` and dated today, so set the date to the Saturday and the number to `Chainwide Advertising`, and save once before touching lines. If the prior week lacks a store that reports net sales this week, stop and report it rather than adding a line.

## Step 4: posting

Open the entry by its direct URL, `https://norms.restaurant365.com/#/form/JournalEntryForm/<TransactionId>`. An entry that already reads Approved needs the unapprove flow in the automation notes before its lines take a change.

Set every line through the line grid's Kendo model. Match a debit line to its store by the location's name, the text after `<number> - `, which is how the report labels its columns:

```js
const g = jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.data().forEach(m => {
  const a = String(m.glAccount || ""), loc = String(m.location || "").replace(/^\d+ - /, "");
  if (/^5410 /.test(a)) { m.set('debit', acc[loc]); m.set('credit', 0); }
  if (/^6699 /.test(a)) { m.set('credit', offset); m.set('debit', 0); }
});
```

Every one of the 24 stores must receive an amount; a store in `acc` with no line, or a 5410 line with no store in `acc`, stops the run.

Then Save, read the `SaveTransaction` body, reload, read all 25 lines back numerically, confirm debits equal credits, and Approve and Close, confirming `"Successfully Approved."` in the `Transaction/Approve` response.

## Verifying the run

Refilter the All Transactions grid after `dataSource.read()`. The Saturday's `Chainwide Advertising` row is done when it reads Approved and its `Amount` equals the offset.

Report a table of store, Total Net Sales, accrual, and posted amount, with the estate total, and list any store you held back for missing sales.

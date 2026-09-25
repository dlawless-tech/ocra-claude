---
name: norms-weekly-cc-fees-accrual
description: Post the weekly credit card fee accrual into NORMS Restaurant365, one journal entry per store at 1.75% of that store's net sales. Use when asked to fill, balance, or approve the NORMS CC Fee Accrual entries in R365, or to check a week's accrual against the Wkly P&L - Location Side by Side report.
---

# Weekly CC fee accrual into the NORMS journal entries

Each store accrues **1.75% of its Total Net Sales** for the operational week. Read every store's net sales from one saved P&L, compute the accruals, then fill the 24 entries R365 already holds for that week.

Session, from one working directory for the whole run:

```bash
../norms-grubhub/scripts/r365-login.sh r365
```

Credentials live in `~/.claude/norms-credentials.md`, which the login script reads. Ask the human only when they are missing or rejected.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting any of this. It carries the frame walk, the soft navigation to All Transactions, the report dialog, the ribbon menus, and the save and approve checks this skill leans on.

## The week

The NORMS operational week runs **Sunday to Saturday**, and the entry is dated the **Saturday that ends it**. The week of 9/13 through 9/19/2026 posts to entries dated 9/19/2026.

Run it once every store's daily sales for the week are in. The 9/19/2026 entries were filled on the morning of 9/22, before sales days landed for Hollywood, Ontario, South Torrance, Van Nuys, and West Covina, and those five posted 15% to 34% short until they were corrected on 9/24.

## Step 1: net sales from the Wkly P&L

Reports sits on the home dashboard; click it to reach My Reports. On the **Profit and Loss** card, open **View** and click the **Wkly P&L - Location Side by Side** button in the dialog. Clicking its label text leaves the card on System View. The card's combobox reads that name when it took.

The view is saved as Location Side by Side - Week, operational calendar, As Of **Previous**, filtered to the legal entity Norms Restaurants, LLC. Run it from the Customize dialog's own Run button (`runReport($event)`, see the automation notes) with every parameter as saved. The report opens in a second tab at `/#/ReportViewer`.

Previous means the last completed operational week, so a run on 9/24/2026 reads Week Ending 09/19/2026. For any other week, click the **As Of** button in Customize and pick `Week End <the Saturday>` from the list; the combobox beside it reads the week once it took. **Confirm the report header reads `Week Ending <the Saturday>`** before using a figure.

Read the figures from the accessibility snapshot. The location headers run Anaheim through Whittier, then `Total`, and the `Total Net Sales` row carries one link per column in the same order:

```bash
grep -oE 'cell "[^"]*"' rep.txt | sed 's/^cell "//; s/"$//' | sed -n '/^Anaheim$/,/^Total$/p' > locs.txt
awk '/cell "Total Net Sales"/{on=1;next} on && /cell "[A-Z]/{exit} on' rep.txt | grep -oE 'link "[^"]*"' | sed 's/link "//;s/"//' > ns.txt
paste locs.txt ns.txt
```

Both files hold 26 lines: 24 stores, **Norms Support Center** at 0.00, and Total. Support Center carries no sales and no entry.

## Step 2: the accruals

```
accrual = round(Total Net Sales x 0.0175, 2)
```

Round half up to the cent. Computing in cents keeps floating point from tipping a half cent: `Math.round(net * 1.75) / 100`. This reproduces every store on the 9/12/2026 week to the penny. The estate total runs a few cents off the report's Total column times 1.75%, because each store rounds on its own.

Before posting, scan for a store whose net sales sit far below its prior week. A drop of more than about 10% often means a missing sales day, and posting it bakes the shortfall in. Report the store and ask whether to wait.

## Step 3: the entries

Soft navigate to All Transactions and filter the grid through its data source. The grid pages on the server, so a filter on the loaded page misses entries:

```js
g.dataSource.pageSize(1000);
g.dataSource.filter({logic: 'and', filters: [{field: 'Number', operator: 'contains', value: 'CC Fee'}]});
```

Then keep the rows whose `Date` is the Saturday. Each week carries **24 Journal Entries numbered `CC Fee Accrual`**, one per store, comment `1.75%  of sales weekly`, name `Journal Entry - CC Fee Accrual`. Each holds two lines at its own location:

```
debit   5510 - Credit Card Fees          accrual
credit  2016 - Accrued Credit Card Fees  accrual
```

The entries exist before the week closes: the 9/19/2026 set was created and approved on 9/19 and the amounts entered on 9/22. If the Saturday has fewer than 24, stop and report which stores are missing rather than building new ones. Through 9/5/2026 the accrual posted as one combined entry across every location, and the per-store set began on 9/12/2026, so an older week reads differently.

## Step 4: posting

Open each entry by its direct URL, `https://norms.restaurant365.com/#/form/JournalEntryForm/<TransactionId>`. The entries are already Approved, and they edit in place without unapproving:

1. A real `playwright-cli click 'button.btn-default:has-text("Edit")'` on the **Edit** button above the line grid. It turns into **Edit Complete**.
2. Set both lines through the line grid's Kendo model, finding each line by its account:

   ```js
   const g = jQuery('[data-role=grid]').data('kendoGrid');
   g.dataSource.data().forEach(m => {
     const a = String(m.glAccount || "");   // "5510 - Credit Card Fees"
     if (/^5510 /.test(a)) { m.set('debit', amt);  m.set('credit', 0); }
     if (/^2016 /.test(a)) { m.set('credit', amt); m.set('debit', 0); }
   });
   ```

3. A real click on **Edit Complete**. It saves on its own: read the newest `SaveTransaction` body, which reads `[["1","<TransactionId>"," "],["1",""]]` when committed.
4. Reload by the same URL and read both lines back numerically.

An entry is done when its two lines each read the accrual after the reload and it still reads Approved. On 9/24/2026 this corrected five approved entries at about a minute each.

## Verifying the run

Refilter the All Transactions grid after `dataSource.read()` and check every one of the 24 rows for the Saturday: status Approved and `Amount` equal to that store's accrual. The grid reads the server, so it is the record of what posted.

Report a table of store, Total Net Sales, accrual, and posted amount, with the estate total, and list any store that did not post or that you held back for missing sales.

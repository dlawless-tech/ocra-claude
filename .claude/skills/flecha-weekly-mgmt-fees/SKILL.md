---
name: flecha-weekly-mgmt-fees
description: Post the weekly management fee journal entry into Flecha Restaurant365, charging each of the four stores 7% of its Total Net Sales to Corporate, from the Weekly Mgmt Fee - Previous P&L view. Use when asked to fill, balance, or approve the Flecha MGMT Fees entry in R365, or to check past weeks' fees against sales.
---

# Weekly management fees into the Flecha journal entry

Corporate charges each store **7% of its Total Net Sales** for the week. Read the four stores' net sales from one saved P&L view, compute the fees, then set them on the week's one `MGMT Fees` entry.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skill>/scripts/r365-login.sh fl
```

Flecha shares the NORMS R365 login, so the script reads `~/.claude/norms-credentials.md`. Ask the human only when it is missing or rejected.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting any of this. It carries the frame walk, the soft navigation, the report dialog, the ribbon menus, and the save and approve checks this skill leans on; the same R365 build serves Flecha.

## The week

Each run posts the **previous week, Monday through Sunday**, to an entry dated **that Sunday**. The dates move forward one week every run: a run in the week of 9/28/2026 posts Monday 9/21 through Sunday 9/27/2026 to the entry dated 9/27/2026, and the next run posts 9/28 through 10/4 to 10/4. Work out the Sunday fresh each run from today's date; the report view, the entry, and `fees.json` all key on it.

**All seven days of sales must be in for all four stores before the run starts.** The report in Step 1 is the check: with Show Unapproved on Yes it counts every day's sales whether or not the Daily Sales Summary has been approved yet, and sales are often still unapproved when the run happens. The 9/27/2026 entry was first filled before Sunday landed and posted $4,772.75 short, each store at 81% to 85% of its week, until it was corrected on 9/29. Daily Sales Summaries do not appear on the All Transactions grid in Flecha, so the grid is no check for this.

## Step 1: net sales from the Weekly Mgmt Fee - Previous view

On the home dashboard the My Reports tile does not route. Soft navigate instead:

```bash
playwright-cli -s=fl eval "() => { history.pushState({}, '', '/react/reports-management/legacy/MyReports'); window.dispatchEvent(new PopStateEvent('popstate')); }"
```

The cards take about 40 seconds. Several cards share the Profit and Loss name; use the one headed exactly `Profit and Loss`. Open **View**, click **Weekly Mgmt Fee - Previous**, and confirm the card's combobox reads that name. Then open that card's **Customize**.

The view was created on 9/29/2026 under this login with every setting the run needs. Confirm each one in the dialog before running:

| Parameter | Setting | Confirm by |
|---|---|---|
| Report Type | Location Side by Side - Week | its combobox |
| Filter By / Filter | Location, 4 items selected | its combobox |
| Calendar | Fiscal | `activeR365` class |
| As Of | **Previous** | the As Of button reads `Previous` |
| Show Unapproved | **Yes** | `valuePair.wanted` on the Yes button |

Previous is the last completed Monday-to-Sunday week, so it moves forward on its own: a run on Tuesday 9/29/2026 reads 9/21 through 9/27. **Current** reads the week still in progress, 9/28 through 10/4 on that same run, and is the wrong week. To post or correct an older week, click **As Of ▼** and pick `Week End <the Sunday>` from the list for that one run. If a setting has drifted, fix it in the dialog (a real `playwright-cli click` on `Previous`; Show Unapproved through the button's scope as the automation notes describe, reading `valuePair.wanted` since the `activeR365` class lags) and save it back with the floppy-disk Update icon beside the view name. This login owns the view, so Update should save; it has not been exercised yet, so confirm a `UserReportView` request answers 200.

The older **Weekly Mgmt Fee** view belongs to the OCRA Bookkeeping user, holds a fixed As Of week, and cannot be updated from this login; leave it for that user.

Run it from the dialog's own Run button (`runReport($event)`). The report opens in a new tab at `/#/ReportViewer`; select that tab and save its snapshot. Every drill-down link in the snapshot carries `Start=<Monday>&End=<Sunday>` and `ShowUnapproved=1`; grep for both to confirm the run.

```bash
node <skill>/scripts/fees.js rep.txt > fees.json
```

It reads the `Week Ending` header and the `Total Net Sales` row across `Flecha 4S Ranch`, `Flecha HB`, `Flecha NB`, `Flecha Town Square` and `Total`, and computes each fee as `Math.round(net * 7) / 100`, rounding half up to the cent. It stops when the headers differ or the stores miss the Total. **Confirm `weekEnding` in `fees.json` is the Sunday being posted** before using a figure. This reproduces every September 2026 week to the penny.

Before posting, compare each store with its prior week. A store down more than about 10% often means a missing sales day; report it and ask whether to wait.

## Step 2: the entry

Soft navigate to All Transactions (from a React page such as the home dashboard) and filter the grid through its data source, since it pages on the server:

```js
g.dataSource.pageSize(1000);
g.dataSource.filter({logic: 'and', filters: [{field: 'Number', operator: 'contains', value: 'mgmt'}]});
```

Keep the row dated the Sunday. Each week carries **one Journal Entry numbered `MGMT Fees`**, location Corporate, comment `To record 7% corporate management fee`, with eight lines, each store paired with a Corporate line right after it:

```
debit   7588 - Corp Management Fee   fee   101 - Flecha HB
credit  7588 - Corp Management Fee   fee   100 - Corporate
debit   7588 - Corp Management Fee   fee   102 - Flecha Town Square
credit  7588 - Corp Management Fee   fee   100 - Corporate
debit   7588 - Corp Management Fee   fee   103 - Flecha 4S Ranch
credit  7588 - Corp Management Fee   fee   100 - Corporate
debit   7588 - Corp Management Fee   fee   104 - Flecha NB
credit  7588 - Corp Management Fee   fee   100 - Corporate
```

Every line comment reads `P8-W3 (7%) Management Fees` in every week. Keep it exactly as it is; the client wants it unchanged. The grid's `Amount` equals the sum of the four fees, `entryAmount` in `fees.json`. A row already Approved at `entryAmount` means the week is done; stop and report it. A row for the Sunday at any other amount is a correction: take it straight to Step 4.

## Step 3: copy the prior week

Each week's entry is a copy of the one before. When the Sunday has no `MGMT Fees` row, open the prior Sunday's entry at `https://flecha.restaurant365.com/#/form/JournalEntryForm/<TransactionId>` and use **Action > Duplicate**, answering **No, transaction only**. The mechanics are in [`../bowery-weekly-mgmt-fees/SKILL.md`](../bowery-weekly-mgmt-fees/SKILL.md) under **Step 3: duplicate the prior week**: the copy is written to the server on that click, opens in a second tab numbered `NJ000xxxxx` and dated today, carrying the prior week's amounts.

On the copy, `fill` then `press Tab` on `#journalEntryDate` (the Sunday) and `#journalEntryNumber` (`MGMT Fees`), read both back, and save once before touching lines. Record the new id from the `SaveTransaction` body. The copy arrives Unapproved, so Step 4 skips its unapprove.

## Step 4: posting

Open the entry at `https://flecha.restaurant365.com/#/form/JournalEntryForm/<TransactionId>`.

1. **Unapprove** an Approved entry: a real click on `#Unapprove > a`, then on `li[data-testid="unapproveMenuItem"]`. The `Transaction/UnApprove` body reads `"They all have been unapproved successfully"`. `goto` the same URL to reload.
2. **Set the lines** through the Kendo model:

   ```bash
   node <skill>/scripts/set-lines.js fees.json > set.js
   playwright-cli -s=fl eval "$(cat set.js)"
   ```

   It returns the eight `[location, debit, credit]` pairs, or `ERR` naming the line whose account or location breaks the shape above.
3. **Save** through the ribbon's `Save` submenu (`saveMenuItem`, fired on the `li`'s scope). The `SaveTransaction` body reads `[["1","<TransactionId>"," "],["1",""]]` when committed.
4. **Reload** by the same URL and read all eight lines back numerically against `fees.json`.
5. **Approve** with a real click on `#Approve > a`, then on `li[data-testid="approveMenuItem"]`. The `Transaction/Approve` body reads `"Successfully Approved."` with the entry's id.

The 9/27/2026 correction ran this path in about three minutes.

## Verifying the run

Return to the home dashboard, soft navigate to All Transactions, and refilter. The Sunday's `MGMT Fees` row reads Approved with `Amount` equal to `entryAmount`. The grid reads the server, so it is the record of what posted.

Report a table of store, Total Net Sales, fee, and posted amount, with the total, and name any store you held back for missing sales.

---
name: bowery-weekly-purchase-trfs
description: Post the weekly purchase transfers journal entry into Bowery Group Restaurant365, moving purchase costs between GL accounts and stores as logged in the GL Reallocation Tracker. Use when asked to fill, balance, or approve the Bowery Purchase Transfers entry in R365, or to check a week's reallocations against the tracker.
---

# Weekly purchase transfers into the Bowery journal entry

The client logs each cost reallocation on the **Reallocations** tab of a weekly tracker: Date, From Location, To Location, Description / Reason, Amount, From GL, To GL. This skill copies the prior week's entry and loads that week's rows into it. The file is named for its Week Ending:

```
c:\Users\trici\OCRA\TML's Files - General\Downloads\GL_Reallocation_Tracker 9.20.26.xlsx
```

Ask the human for the file if it is missing or its name is not the week being posted.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365, for the login, the side-menu walk to All Transactions, the grid data source, and the new-row form. The duplicate, save, and approve behavior lives in [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) under **Duplicate saves on click**, **A rejected save answers 200**, and **Ribbon buttons are menu openers**.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh pt
```

## The week

The Week Ending is the `M.D.YY` in the file name, a Sunday, and the entry is dated that Sunday. Every row's Date falls in the seven days ending that Sunday; the 9/20/2026 tracker's one row is dated 9/20/2026.

## Step 1: read the tracker

```bash
node <skill>/scripts/read-tracker.js "<tracker>" > lines.json
```

It reads rows 5 down to the `Total logged:` row, maps each location to its R365 name, and turns each row into two entry lines: a credit to the From GL at the From location and a debit to the To GL at the To location. Rows that land on the same side, GL, and location add into one line. It stops when the file name carries no Sunday, a row's date falls outside the week, a location is unknown, a GL is missing from the **GL Expense Accounts** tab, a row moves a GL onto itself, the rows miss `Total logged:`, or the week logs no rows. A week with no rows posts no entry; report that.

| Tracker   | Location                 |
|-----------|--------------------------|
| Cookshop  | 200 - Cookshop           |
| Shuka     | 400 - Shuka              |
| Rosie's   | 500 - Rosie's            |
| Shukette  | 600 - Shukette           |
| Vic's     | 700 - Vic's              |
| Bowery    | 800 - Bowery Group Corp  |

`total` in `lines.json` is the entry amount the All Transactions grid shows. The tracker's Entered by, R365 JE #, Accountant Signoff, Date Entered, and Status columns are the client's log and do not feed the entry.

## Step 2: the entry

Filter All Transactions through the grid's data source on Number `Purchase Transfers`. Since 9/13/2026 each week carries one Journal Entry numbered exactly that, header location `600 - Shukette`, with blank line comments. The 9/13 and 9/20/2026 entries each ran one row, the weekly NA Gazoz cost at Shukette:

```
credit  510-01 - Purchases-Beverage Liquor   amount   600 - Shukette
debit   510-04 - Purchases-Beverage N/A      amount   600 - Shukette
```

An Approved entry dated the Week Ending means the week is done; stop and report it.

## Step 3: duplicate the prior week

Open the prior week's entry at `https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/<TransactionId>` and use **Action > Duplicate**. A dialog asks `Duplicate transaction and attachments?`; answer **No, transaction only**, so the prior week's tracker stays off the new entry. The copy is written to the server on that click, opens in a second tab (`tab-select 1`), numbered `NJ000xxxxx` and dated today. `fill` then `press Tab` on `#journalEntryDate` (the Week Ending) and `#journalEntryNumber` (`Purchase Transfers`), read both back, and save once before touching lines:

```bash
bash <skills>/danny-coops-payroll/scripts/save.sh pt
```

A committed save prints `[["1","<id>"," "],["1",""]]`. Record the new id from it.

When no row this week touches Shukette, set the header location to `headerLocation` from `lines.json`, the first row's From location.

## Step 4: set the lines

```bash
node <skill>/scripts/set-lines.js lines.json > set.js
playwright-cli -s=pt eval "$(cat set.js)"
```

It keys each entry line by side, GL, and location, gives every line its week's amount, and clears the comment. It returns `set N lines, debits X credits X` with X equal to `total`.

When the week's lines and the entry's differ, it changes nothing and returns one instruction per difference:

- `ADD <side> <amount> <GL> @ <location>` for a line the entry lacks. Add it through the new-row form under the grid, setting the location to the one named.
- `REMOVE <side> | <GL> | <location>` for a line the week lacks. Delete it with its trash icon.

Then rerun `set-lines.js` until it reports `set`. A `STOP:` names a zero line or two lines on one key; read it before going further. Save with `save.sh` and read the body.

## Step 5: attach the tracker

Every entry carries the tracker it was built from. A real click on **Upload File** in the line grid's attachment panel opens a file chooser, which `playwright-cli upload` answers with a path relative to the working directory:

```bash
cp "<tracker>" .
playwright-cli -s=pt click <button "Upload File" ref>
playwright-cli -s=pt upload "GL_Reallocation_Tracker 9.20.26.xlsx"
```

Take the Upload File ref from a snapshot of a freshly reloaded entry; a snapshot taken right after a save can come back partial and without the button. The upload lands on its own, with no save. It is done when the tracker's link shows in the panel after a reload.

## Step 6: verify and approve

Reload the entry by its id and compare the server copy against the tracker:

```bash
playwright-cli -s=pt eval "$(cat <skills>/bowery-weekly-mgmt-fees/scripts/read-lines.js)" > readback.txt
node <skill>/scripts/check-lines.js lines.json readback.txt
```

It prints `MATCH` only when the date is the Week Ending, the number is `Purchase Transfers`, the entry holds exactly the week's lines, debits equal credits at `total`, and every line sits on its side, GL, and location at its amount. A third argument checks a different number, such as a test entry's.

Approve through a real click on `#Approve > a` then `li[data-testid="approveAndCloseMenuItem"]`, and confirm `"Successfully Approved."` in the `Transaction/Approve` response. The week is done when the All Transactions grid, after `dataSource.read()`, shows the Week Ending's `Purchase Transfers` row Approved at `total`.

Report the `check-lines.js` table, each row's Description / Reason, the entry's status and amount from the grid, and whether the tracker is attached.

## Test entries

A test run numbers the copy `Purchase Transfers TEST` and stops short of approving. Delete it afterward through **Action > Delete** and answer **Yes** to `Are you sure you wish to delete?`; the tab closes on success. The page carries a disabled Theme Builder `Delete` button ahead of the Action menu's, so take the enabled one. Confirm no `TEST` row remains on All Transactions. First run 9/25/2026 against the 9/20/2026 week, duplicating the 9/13 entry, which matched on every line with the tracker attached.

---
name: norms-weekly-change-orders
description: Post the weekly change order journal entry into NORMS Restaurant365, moving each store's change order deposits out of 1072 Cash in Bank-Change Orders into 5910 Cash over Short, from the Change Order Report workbook, with the report attached. Use when asked to fill, balance, or approve the NORMS Change Orders entry in R365, or to check a week's entry against the Change Order Report.
---

# Weekly change orders into the NORMS journal entry

Each store logs its change orders day by day on its own tab of the Change Order Report. What a store pays out for change it bought posts to the entry: a credit to 1072 for each day's deposit and one 5910 debit per store for the week. The weekly file sits in:

```
c:\Users\trici\OCRA\NORMS - General\Journal Entries\Wkly Change Orders\
```

It is named for its week, `Change Order Report- 9.13-9.19.xlsx`, sometimes with a `Copy of ` prefix. Ask the human for the file if it is missing, or if its name does not match the week being posted.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting R365. It covers the soft navigation to All Transactions, the grid data source, Duplicate, the ribbon menus, and the save and approve checks.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/norms-grubhub/scripts/r365-login.sh co
```

## The week

The NORMS operational week runs **Sunday to Saturday**. The entry is dated the **Saturday** and numbered `Change Orders <M-D> through <M-D-YY>`. The 9/13 through 9/19/2026 week posts as `Change Orders 9-13 through 9-19-26`, dated 9/19/2026.

## Step 1: read the report

```bash
node <skill>/scripts/read-report.js "<report>" > lines.json
```

The workbook has one tab per store, named with a two-letter code (AN, CL, ... WH), and a Control tab. On each store tab, column B labels the days `Sun 9-13` through `Sat 9-19` and a `Total Week` row follows them. Only column C, **Chage Order Deposits**, posts. Column D (Change Order Received), E (initials), F (comments), and H and I (flash report over/short) stay off the entry. Stores record the column C deposit with either sign; Anaheim and Pico Rivera use negatives. The script posts the absolute amount.

For each store with any deposit that week, it writes:

```
debit   5910 - Cash over Short                  store's week total   comment blank
credit  1072 - Cash in Bank-Change Orders        each day's deposit   comment M.D (9.15)
```

A store with no deposits gets no lines. The script stops in these cases:

- the file name carries no Sunday through Saturday week
- a store tab is missing, or lacks a row for one of the days
- a column C cell is text
- a store's `Total Week` does not equal the sum of its days
- a store mixes positive and negative deposits in one week
- no store carries a deposit

Take a mixed-sign week to the human, since a negative among positives may be a correction. `total` in `lines.json` is the amount the All Transactions grid shows.

The script maps each tab to its location and carries each location's and GL's id. The Control tab lists Hollywood as `HO`, but its tab is `HW`. A store tab added later stops the run until the script's `SHEETS` table has it.

## Step 2: the entry

Filter All Transactions through the grid's data source on Number containing `Change Orders`. The format started on 9/19/2026, which ran 48 lines across 17 stores at 22,853.00. The header location is `299 - Norms Support Center`. The 9/12/2026 entry, `Change Order Activity 9/6-9/12`, came from a different workbook and carries `Change Order` debit comments and `9/12` date comments; take the 9/19 layout as the model.

An Approved entry already dated the Saturday means the week is done; stop and report it.

## Step 3: duplicate the prior week

Open the prior week's entry at `https://norms.restaurant365.com/#/form/JournalEntryForm/<TransactionId>` and use **Action > Duplicate**. If a dialog asks `Duplicate transaction and attachments?`, answer **No, transaction only**, so the prior week's report stays off the new entry. The copy is written to the server on click, opens in a second tab (`tab-select 1`), numbered `NJ000xxxxx` and dated today. Fill `#journalEntryDate` and `#journalEntryNumber` from `lines.json`, `press Tab` after each, read both back, and save once before touching lines:

```bash
bash <skills>/danny-coops-payroll/scripts/save.sh co
```

A committed save prints `[["1","<id>"," "],["1",""]]`. Record the new id.

## Step 4: load the lines

```bash
bash <skill>/scripts/load-lines.sh co lines.json
```

The store set and line count change every week, so the script rebuilds the grid from `lines.json`. It overwrites each existing row's GL, location, amounts, and comment in order, adds rows through the new-row form when the week has more lines, and deletes surplus rows with a real trash click. It prints the line count, any `add failed`, and each `removed <uid>`. Rerun it after an `add failed`: it rewrites every row from `lines.json` and adds only the rows still missing. Then save with `save.sh` and read the body.

## Step 5: attach the report

Every entry carries the report it was built from. Copy it into the working directory and attach it to a freshly reloaded entry:

```bash
cp "<report>" .
bash <skills>/danny-coops-payroll/scripts/attach.sh co "<report file name>"
```

It prints `attached <name>` once the link shows on the entry.

## Step 6: verify and approve

Reload the entry by its id and compare the server copy against the report:

```bash
playwright-cli -s=co eval "$(cat <skills>/bowery-weekly-mgmt-fees/scripts/read-lines.js)" > readback.txt
node <skill>/scripts/check-lines.js lines.json readback.txt
```

It prints a store table, then `MATCH` only when these all hold: the date and number match `lines.json`, every line sits on its side, GL, location, and comment at its amount, nothing is extra or missing, and debits equal credits at `total`. A third argument checks a different number, such as a test entry's.

Approve through a real click on `#Approve > a` then `li[data-testid="approveAndCloseMenuItem"]`. On an entry opened from Duplicate, the approve closes its tab and takes the `Transaction/Approve` response with it, so `requests` on the remaining tab shows nothing. The week is done when the All Transactions grid, after `dataSource.read()`, shows the Saturday's `Change Orders` row Approved at `total` with the report attached.

Then move the report into the `Completed` folder inside `Wkly Change Orders`, which syncs to Teams.

Report the `check-lines.js` table, the entry's status and amount from the grid, and any store tab whose F column comments flag an error or correction for the week.

## History

The 9/19/2026 entry was keyed by hand. Against `read-report.js` it ties on every store and on the 22,853.00 total, with three differences in how lines were keyed: Downey's three 1,000.00 days (9.13, 9.15, 9.18) were posted as one 3,000.00 line commented `9.15`, and the Inglewood 400.00 (9.18) and Las Vegas 950.00 (9.19) lines carry no comment. The skill posts one line per day.

First live run 9/30/2026 on the 9/26/2026 week: the 9/19 entry duplicated to 48 lines, the week needed 55 across 18 stores at 26,404.00, and the entry matched and was approved with the report attached. On that run one of seven added rows failed, the first add that switched the GL from 1072 to 5910; the pause after the GL change in `load-lines.sh` fixed it.

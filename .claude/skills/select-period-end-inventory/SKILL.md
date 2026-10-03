---
name: select-period-end-inventory
description: Post the period-end inventory journal entry for 370 Select Industries into NORMS Restaurant365, booking the change from the 1210 Inventory-Food balance to the period's Ending Inventory with extension count against 5180, with the count attached. Use when asked to fill, balance, or approve the Select Inventory P<n> entry in R365, or to check Select Industries' 1210 balance against a period count.
---

# Select Industries period-end inventory

Select Industries, the commissary, sends a count at each period end as a workbook and a PDF:

```
c:\Users\trici\OCRA\NORMS - General\Journal Entries\Select Industries\Inventory\
  Period 10 - Ending Inventory with extension.xlsx
  Period 10 - Ending Inventory with extension.pdf
```

The entry books the count less what 1210 already holds at 370, so after it posts the GL balance equals the count. Ask the human for the files if the period's pair is missing.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting R365. Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/norms-grubhub/scripts/r365-login.sh inv
```

## The period

NORMS runs four-week periods ending on a Saturday. The entry is dated that Saturday and numbered `Select Inventory P<n>'<yy>`. P9 2026 ended 9/5/2026, P10 ends 10/3/2026. Confirm the period end with the human when a period could run five weeks.

## Step 1: read the count

```bash
node <skill>/scripts/read-count.js "<Period N - Ending Inventory with extension.xlsx>" > count.json
```

The workbook is a raw JDE export, one sheet, one row per open lot. Column O (`WX#EXA`) is the lot's extended amount and column C names the storage location on the first row of each block. The script totals column O by location and stops on a header that is not the export, a row that is not `OPEN LOTS`, or a non-numeric amount.

Check each location against the PDF's `EXTENDED TOTAL` lines. P10 2026: Lineage Logistics-Area 2 1,643,555.36, Individual Food Service 945.36, Select Industries 24,387.90, total 1,668,888.62. A mismatch means the two files are from different runs; take it to the human.

## Step 2: the 1210 balance

```bash
bash <skill>/scripts/gl-balance.sh inv <period start> <period end>
```

It runs GL Account Detail for `1210 - Inventory-Food`, filtered to `370 - Select Industries`, over the period, and prints the dialog read-back, `BEG`, each entry, and `END`. It stops if any parameter did not take. The location filter is a multi-select that ignores `querySearch`, so the script clicks it, types `370`, and clicks the option.

`END` is the balance the entry changes from. Any line inside the window other than a prior Select Inventory entry is unusual for 1210 at 370; report it before posting. If the window already shows this period's Select Inventory entry, the period is done; stop and report it.

## Step 3: build the lines

```bash
node <skill>/scripts/build-lines.js count.json <END> <period end> > lines.json
```

A count above the balance debits 1210 and credits 5180 Select Inventory - Food Non Taxable Cost; a count below reverses the sides. Both lines sit at 370 with blank comments, and the header location is 370.

## Step 4: duplicate the prior period

Find the prior entry on All Transactions by filtering the grid's data source on Number containing `Select Inventory`, then:

```bash
bash <skill>/scripts/duplicate.sh inv <prior TransactionId> <date> "<number>"
bash <skill>/scripts/set-lines.sh inv lines.json
bash <skills>/danny-coops-payroll/scripts/save.sh inv
```

`duplicate.sh` opens the prior entry, runs **Action > Duplicate** with **No, transaction only**, switches to the copy's tab, fills the date and number, saves, and prints the new id. `set-lines.sh` sets each line's debit and credit by account and stops on a line other than 1210 or 5180. A committed save reads `[["1","<id>"," "],["1",""]]`.

## Step 5: attach, verify, approve

Copy the period's pair into the working directory, reload the entry by id, and attach both:

```bash
bash <skills>/danny-coops-payroll/scripts/attach.sh inv "<file>"
```

Reload and read it back with `<skills>/bowery-weekly-mgmt-fees/scripts/read-lines.js`; date, number, both lines and the total must match `lines.json`, with both files listed. Approve with a real click on `#Approve > a` then `li[data-testid="approveAndCloseMenuItem"]`. That closes the copy's tab and takes the `Transaction/Approve` response with it, so confirm from the evidence below.

The period is done when `gl-balance.sh` over the period shows the entry and `END` equals the count, and the All Transactions grid shows the entry Approved at `total`. Then move both files into `Completed` inside the Inventory folder, which syncs to Teams.

Report the count by location, the GL balance before, the change, and the entry's status.

## History

| Period | Date | Number | Lines | Amount |
|---|---|---|---|---|
| P8 2026 | 8/8/2026 | `Inventory` | Dr 1210 / Cr 4010 Food Taxable | 86,284.03 |
| P9 2026 | 9/5/2026 | `Select Inventory P9'26` | Dr 1210 / Cr 5180 | 402,004.55 |
| P10 2026 | 10/3/2026 | `Select Inventory P10'26` | Dr 5180 / Cr 1210 | 213,691.96 |

P9 is the model: 1210 at 370 opened P9 at 1,480,576.03 and closed at 1,882,580.58. The P8 entry used 4010 Food Taxable as its offset; P9 moved it to 5180.

First run 10/3/2026 on P10 2026: count 1,668,888.62, balance 1,882,580.58, change -213,691.96. Duplicated from P9, both files attached, approved; 1210 at 370 closed P10 at 1,668,888.62. `set-lines.sh` packages the same `model.set` calls that run made by hand.

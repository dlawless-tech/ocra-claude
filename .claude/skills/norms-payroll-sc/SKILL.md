---
name: norms-payroll-sc
description: Post the ADP Support Center payroll journal entry into NORMS Restaurant365. Use when asked to fill, balance, or approve a Payroll - Support Center entry in R365, to reconcile a Support Center pay period against the WVJ file, or to place a Support Center returned check or suspense amount.
---

# ADP Support Center payroll into the NORMS journal entry

ADP files the Support Center payroll under company code **WVJ**, beside the restaurant payroll's WVM files in the same week-ending folder.

```
c:\Users\trici\OCRA\NORMS - General\Payroll\P<NN>'<YY>\WE <MM.DD.YY>\
  WVJ_<paydate>_PR&TAX.csv     every amount, DEBIT signed, all at dept 299
  WVJ Stat Summary.pdf         funding recap
  WVJ Labor Distribution.pdf   per-employee detail
  WVJ Checks & Vouchers.pdf    names the returned checks and their numbers
```

Some periods arrive as `.xlsx`. Run `scripts/xlsx-to-csv.js <file.xlsx> > cur.csv` first; everything downstream reads csv.

PDFs read through `pdftotext -layout`. The folder is named for the week ending, the file for the pay date, so `WE 09.05.26` holds `WVJ_09042026_PR&TAX.xlsx`.

## The WVJ file is cumulative within its accounting period

An accounting period holds two pay dates. The **first** file of the period carries that pay date alone. The **second** carries both, so its amounts include the ones already approved on the first entry.

Post the second file as **current minus prior**. Posting it whole double-counts the first pay date, roughly doubling a 130,000 dollar entry.

Read the period from the folder path. `P09'26` holding both `WE 08.22.26` and `WE 09.05.26` makes 09.05 the second file and 08.22 its prior. Two fixed per-paycheck deductions settle it in seconds: `2142 401k Loan 1` and the `2264` pair run at exactly twice the prior file's figure in a second file, and stand alone in a first file.

`scripts/build-plan.js` takes both files and does the subtraction. Pass `-` as the prior for a first-file period.

## The entry

R365 carries one `Payroll - Support Center` entry per pay date, dated the **day before** the pay date, header location `299 - Norms Support Center`, created as a copy of the prior entry and left Unapproved. It arrives complete, carrying the prior period's amounts.

**Update amounts only.** Accounts, comments, and locations stay as they are. Where an amount has no line to sit on, add one through the grid's new-row form.

Find it at Accounting > Transactions > All transactions, Number contains `Payroll - Support Center`.

Read [`MAPPING.md`](MAPPING.md) before building any amount. It carries the account mapping, the two lines that hold what the file does not name, and the traps that make a plausible entry wrong.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting R365. It is shared with the delivery skills, so fix platform behavior there once.

## Prove the mapping on the prior period first

The entry arrives carrying the prior period's approved amounts, so the proof costs nothing to set up. Map the prior file onto those amounts and compare line by line. A correct mapping reproduces them to the cent.

```bash
scripts/dump-lines.sh <session> lines.json
scripts/build-plan.js prior.csv - lines.json --verify
```

Two mismatches are expected on the `6050` pair, because periods differ on whether MED REIMB sits on its own line or nets into the copay line. Both readings give the same entry total. Anything else is a changed ADP file, so stop and read it.

## Gather

1. Convert the file if it arrived as xlsx, then confirm it sums to zero.
2. Settle first file or second against the period folder, and locate the prior file.
3. Grep the file for `Net Amount`. Each one is a returned check needing its own `2229 - PR Liability - Stale PR Checks` line.
4. Grep for `9999`. That is the suspense, and it has a line waiting for it.

## Build and post

`scripts/build-plan.js cur.csv prior.csv lines.json` emits `[rowIndex, debit, credit]` for every line that changes, and reports on stderr anything with no line to sit on. Lines the period does not use come back as 0.00, which is how a period without mileage or a quarterly bonus is recorded.

Post with `scripts/apply-amounts.sh` in chunks, add any line the report asked for, then run the three checks. Skipping any of them is how an empty or unbalanced entry reaches Approved:

1. **Read every amount back** from its rendered cell, comparing numerically since R365 renders `4` as `4.00`.
2. **Sum both columns before saving** and match against the planned total.
3. **Re-read from the server after saving.** The All Transactions grid's `dataSource.read()` gives a clean server figure without a page load, which would log the session out. A save that never reached R365 leaves the old amounts in place, and approving then commits the prior period's numbers.

Then tie the entry against the Stat Summary:

| Stat Summary | Entry |
|---|---|
| Subtotal Net Pay | `direct deposit` |
| Adjustments/Prepay/Voids | the `2229 - PR Liability - Stale PR Checks` lines, summed |
| 401K/Retirement | `401K / Roth` plus `401k Loan 1` |
| Total Taxes | `total taxes` |

Approve through **Approve and Close**, then verify from the All Transactions grid rather than from what the posting step reported: the status reads Approved and the amount matches the planned total.

## Adding a line

The new-row form sits above the line grid: `#newRowAccountField`, `#newRowDebitInput`, `#newRowCreditInput`, `#newRowCommentField input`, `#newRowLocationField button`, and Add inside `#newRowButtonsContainer`.

The account combobox refuses `fill`. Click `#newRowAccountField input.k-input`, `type` the account number with real keystrokes, then ArrowDown and Enter. Confirm it took by reading `#newRowAccountField input[name="newRowAccountField"]`, which holds the account's guid once selected.

Address that visible input structurally. After a save its `name` reverts to the raw Angular template `{{dropdownName || name || 'glaccountDropdown'}}_input` until the next digest, so a selector written against the interpolated name matches nothing and the click reports a missing element.

The location button already reads `299 - Norms Support Center`, which is the only location this entry uses.

## Repointing a line to another account

Editing the account in place beats deleting the row and re-adding it, because the row's trash icon raises a browser dialog that freezes the session. Take the guid from the new-row combobox, then set both fields on the model and Clear the form:

```js
m.set('glAccountId', guid);
m.set('glAccount', '2229 - PR Liability - Stale PR Checks');
```

The data source is a Kendo ObservableArray, so walk it with `dataSource.total()` and `dataSource.at(k)`. Calling `dataSource.data().findIndex` throws.

An account change is invisible to the All Transactions grid, whose Amount only proves amounts. Confirm it by closing the entry tab, firing the Number cell again, and re-reading the reopened lines.

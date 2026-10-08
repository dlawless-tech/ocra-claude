---
name: norms-payroll-sc
description: Post the ADP Support Center payroll journal entry into NORMS Restaurant365, attach the WVJ csv and Stat Summary, and file the pay's folder to Completed_SC. Use when asked to fill, balance, or approve a Payroll - Support Center entry in R365, to reconcile a Support Center pay period against the WVJ file, or to place a Support Center returned check or suspense amount, or when the every-other-Thursday file-drop run starts it.
---

# ADP Support Center payroll into the NORMS journal entry

ADP files the Support Center payroll under company code **WVJ**, every other Friday. From the 10/02/2026 pay on, the files are dropped into `c:\Users\trici\OCRA\NORMS - General\Payroll\To Process SC`, beside a `WE <MM.DD.YY>` folder named for the **Saturday before the pay date** (pay date less six days) that may already hold the Checks & Vouchers. Finished folders move to `Completed_SC`. Pays through 9/18 sit in `Completed_Norms` week folders.

```
To Process SC\
  WVJ_<paydate>_PR&TAX.csv     every amount, DEBIT signed, all at dept 299
  WVJ Stat Summary.pdf         funding recap
  WVJ Labor Distribution.pdf   per-employee detail
  WVJ Checks & Vouchers.pdf    names the returned checks and their numbers
```

Some periods arrive as `.xlsx`. Run `scripts/xlsx-to-csv.js <file.xlsx> > cur.csv` first; everything downstream reads csv.

PDFs read through `pdftotext -layout`. The folder is named for the Saturday, the file for the pay date, so `WE 09.26.26` holds `WVJ_10022026_PR&TAX.csv`.

A catch-up pay can arrive with two csvs for one pay date, such as the 10/02 bonus void batch plus a `(1)` copy carrying the period's running total. Post from the one that ties to the Stat Summary and attach both.

## The WVJ file is cumulative within its accounting period

An accounting period holds two pay dates. The **first** file of the period carries that pay date alone. The **second** carries both, so its amounts include the ones already approved on the first entry.

Post the second file as **current minus prior**. Posting it whole double-counts the first pay date, roughly doubling a 130,000 dollar entry.

Pays alternate: 9/18 opened P10'26 and 10/02 closed it, so 10/16 opens P11. Two fixed per-paycheck deductions confirm it in seconds: `2142 401k Loan 1` and the `2264` pair run at exactly twice the per-pay figure in a second file, and equal it in a first file. The latest approved entry with a nonzero `401k Loan 1` line carries the per-pay figure (1,071.88 on 9/17). A second file's prior is the csv in the newest `Completed_SC` folder.

`scripts/build-plan.js` takes both files and does the subtraction. Pass `-` as the prior for a first-file period.

## The entry

R365 carries one `Payroll - Support Center` entry per pay date, dated the **day before** the pay date, header location `299 - Norms Support Center`. Create it from the latest approved one: open it by id (`#/form/JournalEntryForm/<id>`), then `Action > Duplicate`. Answer `No, transaction only` if R365 asks about attachments. The copy opens in a second tab (`tab-select 1`), numbered `NJ000xxxxx` and dated today, carrying the prior entry's lines and amounts.

Duplicate writes the copy to the server the moment it is clicked. `fill` then `press Tab` on `#journalEntryDate` (pay date less one), `#journalEntryNumber` (`Payroll - Support Center`), `#journalEntryPayrollStartDate` (pay date less five) and `#journalEntryPayrollEndDate` (pay date plus one), read all four back, and `scripts/save.sh <session>` before touching lines. The two payroll dates are required, and a save without them is rejected.

**Update amounts only.** Accounts, comments, and locations stay as they are. Where an amount has no line to sit on, add one through the grid's new-row form.

`scripts/all-transactions.sh <session>` lists the latest entries with date, status, amount and id, after `scripts/r365-login.sh <session>`.

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
3. Grep the file for `Net Amount`. A positive one is a returned check, and it goes on the `2229 - PR Liability - Stale PR Checks` line. A negative one is paper checks issued, which need one `1040` line per check from the Checks & Vouchers, and `build-plan.js` stops on it.
4. Grep for `9999`. That is the suspense, and it has a line waiting for it.

## Build and post

`scripts/build-plan.js cur.csv prior.csv lines.json` emits `[rowIndex, debit, credit]` for every line that changes, and reports on stderr anything with no line to sit on. Lines the period does not use come back as 0.00, which is how a period without mileage or a quarterly bonus is recorded, and so do lines no slot claims, like the check lines a copied bonus entry carries. It exits 1 when anything has no line or the plan is out of balance.

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

Approve through **Approve and Close**: real-click `#Approve > a`, then `li[data-testid="approveAndCloseMenuItem"]`. The entry's tab closes. Verify from `all-transactions.sh` rather than from what the posting step reported: the status reads Approved and the amount matches the planned total.

## Attach and file

Attach every PR&TAX csv and the Stat Summary with `scripts/attach.sh <session> <file>`, one call each; each prints `attached <name>`. Attachments stick on an unapproved or an approved entry without a save. Reopen the entry by id and confirm all are listed.

Then move every file in `To Process SC` into the `WE` folder, move that folder into `Completed_SC`, and create the next pay's `WE <MM.DD.YY>` in `To Process SC`: pay date plus eight, the Saturday before the next pay. Close the session.

## Unattended run

Two Task Scheduler tasks run `scripts/thursday-run.ps1` every other Thursday from 10/15/2026, the day before each pay date (`scripts/register-task.ps1` sets them up):

- **NORMS Payroll SC - Thursday Watch**, every 15 minutes from 4:00 to 11:45 AM. It waits until a `WVJ_*_PR&TAX*.csv`, the Stat Summary, and the Labor Distribution are all in `To Process SC`, each at least 2 minutes old, and exits quietly until then.
- **NORMS Payroll SC - Thursday**, noon. The last check, and a Teams card naming the missing files when they are not all in (once per day).

The wrapper reads the pay date from the csv name, copies the files (and the Checks & Vouchers, from the drop or the `WE` folder) to `.scratch/norms-payroll-sc/pd<MMdd>`, starts this skill headless with a prompt beginning `Unattended run` that names the pay date, work directory, each file's copy, and the newest `Completed_SC` folder, and writes `done.txt` after, so the pay runs once. `-Force` reruns a pay.

No human answers during the run, so:

- Never ask. Use session `npsc`, and run every command as `cd <work directory> && ...`.
- Settle first file or second by the `401k Loan 1` rule. A loan figure that is neither once nor twice the per-pay figure, or a second file whose prior folder holds other than one csv, fails the run.
- Prove the mapping when a prior regular csv and its approved entry are both at hand. Skip it with a warning when they are not, as for 10/16, whose prior pay was the void batch.
- An entry already dated the day before the pay date means the pay was started by hand. Approved: post nothing, and still attach any missing file. Unapproved: fail the run and name it.
- Two csvs where neither ties the Stat Summary, a `build-plan.js` exit of 1, a Stat Summary tie that misses by more than two cents, or a rejected login fails the run: write `result.json` with `status` `failed` and the reason in `note`.
- A run that fails after Duplicate leaves an `NJ000xxxxx` entry behind: name it in `warnings` and leave it unapproved.
- Attach the copies in the work directory (same names). Leave the originals in `To Process SC` and the folders alone; the wrapper files them.

Close `npsc`, then write `result.json` in the work directory:

```json
{ "payDate": "10/16/2026", "status": "approved", "total": 133463.81, "directDeposit": 79661.07,
  "number": "NJ000xxxxx", "transactionId": "...", "attached": true, "warnings": [], "note": "" }
```

`status` is `approved` or `failed`. `attached` is true only when every csv and the Stat Summary read back on the reloaded entry.

Only after `approved` with `attached`, the wrapper files the folder to `Completed_SC` and creates the next pay's folder, adding `filed`, `filedTo`, and `nextFolder` to the result. It then posts the result to the payroll channel through `scripts/notify-teams.ps1`, or a failure card when `result.json` is missing. The webhook is the restaurant payroll's, in `~/.claude/norms-payroll.json` outside the repo, which tags Regina Leong on every card.

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

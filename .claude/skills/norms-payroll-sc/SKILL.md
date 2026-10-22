---
name: norms-payroll-sc
description: Post the ADP Support Center payroll journal entry into NORMS Restaurant365, attach the WVJ csv and Stat Summary, and file the pay's folder to Completed_SC. Use when asked to fill, balance, or approve a Payroll - Support Center entry in R365, to reconcile a Support Center pay period against the WVJ file, or to place a Support Center returned check or suspense amount, or when the every-other-Thursday file-drop run starts it.
---

# ADP Support Center payroll into the NORMS journal entry

ADP files the Support Center payroll under company code **WVJ**, every other Friday. From the 10/02/2026 pay on, the files are dropped into `c:\Users\trici\OCRA\NORMS - General\Payroll\To Process SC`, beside a `WE <MM.DD.YY>` folder named for the **Saturday before the pay date** (pay date less six days) that may already hold the Checks & Vouchers. Finished folders move to `To Process SC\Completed_SC`. Pays through 9/18 sit in `To Process_Norms\Completed_Norms` week folders.

```
To Process SC\
  Completed_SC\                finished pay folders
  WE <MM.DD.YY>\               the current pay's folder
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

Pays alternate: 9/18 opened P10'26 and 10/02 closed it, so 10/16 opens P11. Two fixed per-paycheck deductions confirm it in seconds: `2142 401k Loan 1` and the `2264` pair run at exactly twice the per-pay figure in a second file, and equal it in a first file. The latest approved entry with a nonzero `401k Loan 1` line carries the per-pay figure (1,071.88 on 9/17, 749.16 from 10/16). The loan changes when an employee's loan does, so a figure that is neither once nor twice the last one falls back to the Stat Summary: a file whose direct deposit, taxes and 401K equal this pay's Stat Summary alone is a first file. A second file's prior is the csv in the newest `Completed_SC` folder.

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

A `REPOINT` line in the report names a bonus line still on `6015`. Repoint it to `6030 - MIT/SC Bonus` as in "Repointing a line to another account", and confirm it took before posting amounts.

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

R365 refuses the approval with "Unapproved DSS Journals exist for this Legal Entity between <Sun> and <Sat>" while the week holding the entry date has open DSS journals, which is the normal state on Thursday and Friday. Leave the entry unapproved and attach anyway; it is approved once the week's DSS journals are.

The lock reads the payroll start and end dates, not the entry date. The 10/16/2026 pay was approved by hand on 10/16 with entry date 10/10/2026 and both payroll dates cleared (R365 then shows 1/1/1900). Entries before it carried pay date less five to pay date plus one (10/11 to 10/17 for 10/16). That was a one-off, not yet a rule; record how the next pay is dated before changing the default.

## Attach and file

Attach every PR&TAX csv and the Stat Summary with `scripts/attach.sh <session> <file>`, one call each; each prints `attached <name>`. Attachments stick on an unapproved or an approved entry without a save. Reopen the entry by id and confirm all are listed.

Then move every file in `To Process SC` into the `WE` folder, move that folder into `To Process SC\Completed_SC`, and create the next pay's `WE <MM.DD.YY>` in `To Process SC`: pay date plus eight, the Saturday before the next pay. Close the session.

## Unattended run

Three Task Scheduler tasks run `scripts/thursday-run.ps1` every other week from Thursday 10/15/2026, the day before each pay date, through the pay date itself, since ADP can drop the files on Friday, then the Monday after (`scripts/register-task.ps1` sets them up):

- **NORMS Payroll SC - Watch**, every 15 minutes from Thursday 4:00 AM to Friday 4:45 PM. It waits until a `WVJ_*_PR&TAX*.csv`, the Stat Summary, and the Labor Distribution are all in `To Process SC`, each at least 2 minutes old, and exits quietly until then.
- **NORMS Payroll SC - Friday Final**, Friday 5:00 PM. The last check, and a Teams card naming the missing files when they are not all in.
- **NORMS Payroll SC - Monday Approve**, every 2 hours from Monday 7:00 AM to 5:00 PM, with `-Mode approve`. It acts only on a `result.json` with `status` `awaiting-approval`, and starts this skill with a prompt beginning `Approve-only run`. It stays quiet while R365 still holds the entry, and posts the card once the entry is approved, or at the 5:00 PM try.

The wrapper reads the pay date from the csv name, copies the files (and the Checks & Vouchers, from the drop or the `WE` folder) to `.scratch/norms-payroll-sc/pd<MMdd>`, starts this skill headless with a prompt beginning `Unattended run` that names the pay date, work directory, each file's copy, and the newest `Completed_SC` folder, and writes `done.txt` after, so the pay runs once. `-Force` reruns a pay.

No human answers during the run, so:

- Never ask. Use session `npsc`, and run every command as `cd <work directory> && ...`.
- Settle first file or second by the `401k Loan 1` rule, falling back to the Stat Summary tie when the loan changed; warn when it did. A file that settles neither way, or a second file whose prior folder holds other than one csv, fails the run.
- Repoint a bonus line `build-plan.js` flags from 6015 to 6030, and add a warning naming it. A repoint that does not read back fails the run.
- An approval refused for unapproved DSS journals is expected. With the entry tied, saved and attached, write `status` `awaiting-approval` and put the refusal in `note`. The Monday task approves it.
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

`status` is `approved`, `awaiting-approval`, or `failed`. `attached` is true only when every csv and the Stat Summary read back on the reloaded entry.

### Approve-only run

The prompt names the work directory, the entry's number, transaction id and planned total, and the result file. Use session `npsc` from the work directory, log in, and check the entry in `all-transactions.sh`:

- Already Approved at the planned total: approve nothing.
- Unapproved at the planned total: open it by id and approve through Approve and Close, then verify from `all-transactions.sh`.
- Any other amount, or no such entry: set `status` `failed` and name what you found in `note`.
- Approval refused again for DSS journals: leave `status` `awaiting-approval` and update `note`.

Reopen the entry and confirm the attachments are still listed. Close `npsc`, then rewrite the result file in place, keeping its fields and warnings, with `status` `approved` when the entry reads Approved at the planned total, and `note` cleared.

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

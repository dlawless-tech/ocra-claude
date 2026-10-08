---
name: norms-payroll
description: Post the weekly ADP payroll journal entry into NORMS Restaurant365, attach the CSV, pay details and Stat Summary, and file the week folder to Completed_Norms. Use when asked to fill, balance, or approve a NORMS Payroll entry in R365, to reconcile a payroll week against the ADP Stat Summary, to break out payroll voids and adjustments by employee, or when the Thursday file-drop run starts it.
---

# ADP payroll week into the NORMS journal entry

ADP delivers four files per week, and the user supplies a fifth. The CSV carries every amount, the Stat Summary says how the cash line splits and is the tie-out, the Labor Distribution names the voids, the Checks & Vouchers confirms them, and the PAY DETAILS LG file splits hourly labor FOH / BOH. Read all five before touching R365.

From the 10/3/2026 week on, files land in `c:\Users\trici\OCRA\NORMS - General\Payroll\To Process_Norms`:

```
To Process_Norms\
  WVM_<paydate>_PR&TAX.csv     every amount, by account and dept, DEBIT signed
  WVM Stat Summary.pdf         funding recap, the cash split and the tie-out
  WVM Labor Distribution.pdf   the Void PP: blocks, one per adjustment
  NORMS - PAY DETAILS LG ... .xlsx   hourly earnings by <location>.<job GL>
  WE <MM.DD.YY>\               the week folder, waiting
    WVM Checks & Vouchers.pdf  per-employee vouchers, confirms void names; sometimes absent
```

When the week is done, all files go into the week folder, the week folder moves to `Payroll\Completed_Norms`, and the next week's `WE <MM.DD.YY>` is created in `To Process_Norms`. Completed weeks are in `Completed_Norms`, with spellings that drift (`WE 09.05.26`, `WE 9.12`, `WE 10.03.26`), so list it rather than building the name.

PDFs read through `pdftotext -layout`. The week folder is named for the week ending, the CSV for the pay date (a Friday), so `WE 10.03.26` holds `WVM_10092026_PR&TAX.csv`. Convert the pay details file with `../norms-payroll-labor-breakdown/scripts/xlsx-to-csv.js`.

Read [`MAPPING.md`](MAPPING.md) before building any amount. It carries the account and memo mapping, which lines split by location and which roll up, and the traps that make a plausible entry wrong.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting R365. It is shared with the delivery skills, so fix platform behavior there once.

## The entry

R365 carries one `Payroll` entry per week, dated that week's **Saturday**, header location `299 - Norms Support Center`, created as a copy of the prior week and left Unapproved. It arrives complete: every account, comment, and location already set, carrying last week's amounts.

**Update amounts only.** Accounts, comments, and locations stay as they are, except the named void lines, whose comments name that week's employees. Where an amount has no line to sit on, add one through the grid's new-row form.

`scripts/all-transactions.sh <session>` lists the latest Payroll entries with date, number, location, status, amount, and id, after `../norms-doordash/scripts/r365-login.sh <session>`. An entry dated the week's Saturday that already exists means the week was started; Approved means it is done.

To create the week, open the prior week's entry by id (`https://norms.restaurant365.com/#/form/JournalEntryForm/<id>`), real-click `#Action > a`, then `li[data-testid="duplicateMenuItem"]`. No dialog follows: the copy is saved on the spot and opens in a second tab (`tab-select 1`), numbered `NJ000xxxxx` and dated today, with no attachments. `fill` then `press Tab` on `#journalEntryDate` (the Saturday), `#journalEntryNumber` (`Payroll`), `#journalEntryPayrollStartDate` (the Sunday before), and `#journalEntryPayrollEndDate` (the Saturday), read all four back, and `scripts/save.sh <session>` before touching lines. `save.sh` prints the server's reply; a committed save reads `[["1","<id>"," "],["1",""]]`.

## Prove the mapping on the prior week first

Apply the mapping to the **prior** week's CSV and compare against that week's approved entry, line by line. A correct mapping reproduces it to the cent. This costs one run and catches a changed ADP file before it reaches 700,000 dollars of postings.

`scripts/build-plan.js --verify`, with the prior week's pay details file as `--detail`, does the comparison and prints every line that fails to match. Four kinds of mismatch are expected, because the CSV is not their source: the named void lines, the `direct deposits` split, the tax rounding, and any suspense disposition. Anything else is a changed ADP file, so stop and read it.

## Gather

1. Parse the CSV. `DEBIT` is signed: positive is a debit, negative a credit. `DEPT_ID` is the R365 location number. Confirm the file sums to zero.
2. Read the Stat Summary page 3 for **Checks**, **Direct Deposits**, **Subtotal Net Pay**, **Adjustments/Prepay/Voids**, and **Total Net Pay Liability**. Confirm Total Net Pay Liability equals the CSV's 1030 total.
3. Grep the Labor Distribution for `Void PP:`. Each block carries a check number and an amount. The manual checks are the ones numbered in the current `223xx` series, running on from the prior week's last number. Other `Void PP:` blocks, such as a voided payroll check printed once positive and once negative, net to zero and stay off the entry. Confirm the manual checks sum to the Stat Summary's Adjustments figure. The employee's name sits a few lines above the block as `LASTNAME,FIRSTNAME` with any middle name on the next line.
4. Confirm each void name and amount against the Checks & Vouchers. A manual check prints with no payroll check number and a `NON-NEGOTIABLE - VOID` marker.

## Build and post

`scripts/build-plan.js <csv> lines.json --detail <pay-details.csv>` maps the CSV onto the entry's existing lines and emits `[rowIndex, debit, credit]` for every line that changes. It stops if a store's hourly total does not tie to the pay details file, or if the file carries a job GL missing from the key; the fix for either is in [`../norms-payroll-labor-breakdown/SKILL.md`](../norms-payroll-labor-breakdown/SKILL.md). Lines with no CSV row behind them this week come back as 0.00, which is how a week without mileage or a sign-on bonus is recorded.

Then apply the hand adjustments from [`MAPPING.md`](MAPPING.md) with `scripts/finish-plan.js`:

```bash
node scripts/finish-plan.js <csv> lines.json plan.json --taxes <Stat Summary Total Taxes> \
  --voids "22363|Garcia, Rachel Michelle|234.64;22364|Martinez, Sergio|893.98" --out plan-final.json --comments comments.json
```

Total Taxes is the sum of the two figures on the Stat Summary's `Total Taxes` row (EE withheld and ER contrib. debited). Voids run in check number order, each named `Lastname, Firstname Middle` as the Labor Distribution prints it. The script moves garnishments and total taxes onto the two blank-comment 1030 lines, moves `6040` at 299 by the tax rounding, splits 1030 into direct deposits and the void lines, zeroes unused void lines, and stops unless the plan balances. It stops when the week has more voids than void lines; add lines first, re-dump, rerun.

Post with `scripts/apply-amounts.sh <session> plan-final.json` and `scripts/apply-comments.sh <session> comments.json`, then run the three checks. Skipping any of them is how an empty or unbalanced entry reaches Approved:

1. **Read every amount back** from its rendered cell, comparing numerically since R365 renders `4` as `4.00`.
2. **Sum both columns before saving** and match against the planned total.
3. **Reload after saving** and re-read all lines from the server. A save that never reached R365 leaves the old amounts in place, and approving then commits last week's numbers.

Then tie the entry against the Stat Summary:

| Stat Summary | Entry |
|---|---|
| Subtotal Net Pay | `direct deposits (checking / savings)` |
| Adjustments/Prepay/Voids | the named void lines, summed |
| Wage Garnishments | `wage garnishments` |
| 401K/Retirement | `401k / roth` plus `401k loan` |
| Total Taxes | `total taxes` |

Approve through **Approve and Close**: real-click `#Approve > a`, then `li[data-testid="approveAndCloseMenuItem"]`. The entry's tab closes. Verify from `all-transactions.sh` rather than from what the posting step reported: the status reads Approved and the amount matches the planned total.

## Attach and file

Reopen the approved entry by id and attach the PR&TAX CSV, the pay details xlsx, and the Stat Summary with `scripts/attach.sh <session> <file>`, one call each; each prints `attached <name>`. An approved entry takes attachments with no save. Reload and confirm all three are listed.

Then move every file in `To Process_Norms` into the week folder, move the week folder into `Completed_Norms`, and create the next week's `WE <MM.DD.YY>` (Saturday plus 7) in `To Process_Norms`. Close the session.

## Adding a line

The new-row form sits above the line grid: account combobox, debit, credit, comment, location button, Add.

The account combobox refuses `fill`. Click it, `type` the account number with real keystrokes, then ArrowDown and Enter. The location button opens a checkbox list: check the wanted location and uncheck the default before closing.

To move an existing line to another location, copy `locationId` and `location` from a line that already carries it.

A store missing its `5241 - FOH Hourly` line, or an entry still carrying `5212 - Store Labor (Hourly)` lines, is a job for the labor breakdown skill's `apply-split.sh`, which adds, repoints, and deletes those lines by script.

## Unattended run

Two Task Scheduler tasks run `scripts/thursday-run.ps1` (`scripts/register-task.ps1` sets them up):

- **NORMS Payroll - Thursday Watch**, Thursdays every 15 minutes from 5:00 to 11:45 AM. It waits until the PR&TAX CSV, Stat Summary, Labor Distribution, and PAY DETAILS xlsx are all in `To Process_Norms`, each at least 2 minutes old, and exits quietly until then.
- **NORMS Payroll - Thursday**, noon. The last check, and a Teams card naming the missing files when they are not all in (once per day).

The wrapper takes the week from the CSV's pay date less six days, copies the files (and the Checks & Vouchers, from the drop or the week folder) to `.scratch/norms-payroll/wk<MMdd>`, starts this skill headless with a prompt beginning `Unattended run` that names the week ending, work directory, each file's copy, and the prior week's folder in `Completed_Norms`, and writes `done.txt` after, so the week runs once. `-Force` reruns a week.

No human answers during the run, so:

- Never ask. Use session `npay`, and run every command as `cd <work directory> && ...`.
- Prove the mapping on the prior week with that week's CSV and pay details from the prior week folder. A mismatch outside the four expected kinds fails the run before Duplicate.
- An entry already dated the Saturday means the week was started by hand. Approved: post nothing, and still attach any of the three files that are missing. Unapproved: fail the run and name it.
- A manual check total that misses the Stat Summary's Adjustments, a `build-plan.js` or `finish-plan.js` stop, a Total Net Pay Liability that misses the CSV's 1030, or a rejected login fails the run: write `result.json` with `status` `failed` and the reason in `note`.
- Duplicate writes the copy the moment it is clicked. A run that fails after it leaves an `NJ000xxxxx` entry behind: name it in `warnings` and leave it unapproved.
- More voids than void lines: add the lines through the new row form, re-dump, rerun `finish-plan.js`. If adding fails, fail the run.
- Attach the copies in the work directory (same names). Leave the originals in `To Process_Norms` and the folders alone; the wrapper files them.

Close `npay`, then write `result.json` in the work directory:

```json
{ "weekEnding": "10/3/2026", "status": "approved", "total": 699062.74, "directDeposits": 470276.75, "voids": 4, "voidTotal": 1481.86,
  "number": "NJ00022580", "transactionId": "...", "attached": true, "warnings": [], "note": "" }
```

`status` is `approved` or `failed`. `attached` is true only when all three files read back on the reloaded entry.

Only after `approved` with `attached`, the wrapper moves the files into the week folder, the week folder into `Completed_Norms`, and creates next week's folder, adding `filed`, `filedTo`, and `nextFolder` to the result. It then posts the result to the payroll channel through `scripts/notify-teams.ps1`, or a failure card when `result.json` is missing. The webhook lives in `~/.claude/norms-payroll.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "Regina Leong", "email": "rleong@ocra-us.com"}, "mentionWhen": "always"}`. Regina is tagged on every card.

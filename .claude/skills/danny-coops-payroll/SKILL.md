---
name: danny-coops-payroll
description: Post the weekly payroll journal entry into Danny & Coop's Restaurant365 from the payroll journal export, attaching the file and filing it to Completed. Use when asked to build, balance, or approve a Danny & Coops Payroll entry in R365, to reconcile a Danny & Coops pay week against its payroll files, or when the file-drop or Wednesday scheduled run starts it.
---

# Danny & Coops payroll week into the R365 journal entry

Files land in `c:\Users\trici\OCRA\TML's Files - General\Downloads` or its live `we <M.D>` week folder, sometimes prefixed with the week, so list both and match on the name's tail. Finished files sit in `Downloads\Completed\we <M.D>`. From the 9/27 week on, the user sends one file:

```
payroll-journal_<date>.csv        one row per employee plus a totals row: period, pay day, payment method, every earnings, tax and deduction column, net pay
```

The date in its name is the export day, not the pay day; the Period Start, Period End and Payday columns carry the period. Weeks through 9/20 came as a pair, `account-summary.csv` plus `payroll-summary_<pay day>.csv`, and the builder still takes that pair.

The entry is dated the **period end**, a Sunday. The user attaches the week's file to the entry.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365, and its NORMS twin's section "Duplicate saves on click and drops the payroll dates" in [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md). The same R365 grid runs here.

## The entry

One `Payroll` entry per week, header location `10100 - Danny & Coop's`, with the header's Payroll Start and End dates set to the period. Each week is a duplicate of the prior week, so the lines arrive in this order:

| Account | Side | Amount | Comment |
|---|---|---|---|
| 60050 - Hourly Wages | Dr | Earnings: Wages + Overtime + Non-Hourly Wages | `wages, overtime, non-hourly wages` |
| 67100 - Payroll Taxes | Dr | every Taxes row, less the payroll summary's EE PFL and EE SDI totals | `total taxes - NY PD Fam Leave & SDI` |
| 25100 - Employee Tips Payable | Dr | Earnings: Tips | `tips` |
| 10001 - Danny & Coops Operating 1563 | Cr | Direct Deposit | `direct deposit` |
| 60100 - Manager Salaries | Dr | Earnings: Salaries | `salaries` |
| 67600 - Bonus | Dr | Earnings: Bonus | `bonus` |
| 90760 - Payroll Processing Fees | | 0.00, nothing in the files feeds it | |
| 10001 - Danny & Coops Operating 1563 | Cr | one line per Paper Check | the employee's name |

The paper-check lines track that week's checks exactly: one line per check, none left over. The prior week's check lines get deleted when a week has fewer checks, and new lines get added when it has more.

Taxes on the entry are the employer (ER) taxes less the employees' PFL and SDI withholdings. Deductions (child support) are remitted through the direct deposit pull and stay off the entry.

From the journal, the builder derives the account summary: a paper check is each `Manual` payment method row at that employee's net pay, and direct deposit is gross plus ER taxes, less EE PFL and SDI, less paper checks. That formula reproduced the 9/20 account summary's direct deposit exactly. It also makes direct deposit the plug, so the balance check holds by construction; tell the user to tie direct deposit to the 1563 payroll withdrawal when it clears.

## Build

Work in one scratch directory for the whole run, since `playwright-cli` binds sessions to it. Copy the file there first: the Downloads path carries an apostrophe that MSYS path conversion mangles.

```bash
node scripts/build-plan.js payroll-journal_<date>.csv
node scripts/build-plan.js account-summary.csv payroll-summary_<pay day>.csv     # the older pair
```

The builder stops rather than emitting a plan that fails a check: a payment method other than `Manual` or `Direct Deposit`, an unmapped earnings or nonzero reimbursement line, a deduction that is not a wash, a paper check that differs from that employee's net pay, or an entry out of balance. With the pair it also stops when the files cover different pay days or their earnings fail to tie. A stop on a new line type means asking the user which account it posts to.

## Prove the mapping on the prior week first

Dump the prior week's approved entry and run the builder against its files with `--entry`. A correct mapping prints `entry matches plan`. Prior weeks' files sit in `Downloads\Danny & Coops Payroll`.

Any difference is a changed export, or a prior entry keyed by hand, so stop and read it. Weeks before 9/13 carry a leftover 0.00 check line and no comments, so they never match cleanly.

## Post

1. `scripts/r365-login.sh <session>`, then `scripts/all-transactions.sh <session>`. It lists the latest Payroll entries with date, status, amount, and id. An Approved entry dated the period end means the week is done.
2. Open the prior week's entry by id, then `Action > Duplicate`. The copy opens in a second tab (`tab-select 1`), numbered `NJ000xxxxx` and dated today. `fill` then `press Tab` on `#journalEntryDate` (period end), `#journalEntryNumber` (`Payroll`), `#journalEntryPayrollStartDate`, and `#journalEntryPayrollEndDate`, read all four back, and `scripts/save.sh <session>` before touching lines.
3. `scripts/dump-lines.sh <session> je.json`, then `node scripts/build-plan.js <files> --entry je.json --out edits.json`. Check lines pair with checks by employee name first, then by position. The builder prints `ADD LINE` for each check with no row to sit on and `DELETE row` for each check row the week lacks.
4. `scripts/apply-edits.sh <session> edits.json` sets debit, credit, and comment on each changed row, adds the new check lines, and deletes the unneeded ones. The script prints its `edited`, `added`, and `deleted` counts; they match the builder's output, and `err` is empty.
5. Dump and rerun the builder before saving. Then `save.sh`, reload by passing the id to `dump-lines.sh`, and rerun the builder with `--entry`. It prints `entry matches plan` only when the server copy is right.
6. `scripts/attach.sh <session> <file>` attaches the week's file and prints `attached <name>`. `save.sh`, reload through `dump-lines.sh` with the id, and confirm the file is still listed and the entry still matches the plan.
7. Approve through **Approve and Close**, then rerun `all-transactions.sh`: the week reads Approved at the planned total.

8. `scripts/file-week.sh <original file> <period end>` moves the week's file from Downloads into `Completed\we <M.D>`, creating the folder, and prints `filed <path>`. It refuses to overwrite a file already there.

Report the plan's lines and total, the final status and amount from All Transactions, and, for a journal week, that direct deposit is derived and awaits the bank tie.

## Unattended run

Two Task Scheduler tasks run `scripts/payroll-run.ps1` (`scripts/register-task.ps1` sets them up):

- **Danny & Coops Payroll - File Drop**, every 10 minutes. It looks for a `*payroll-journal*.csv` in Downloads or a `we *` folder, at least 2 minutes old so a syncing file is skipped, and exits quietly when none is waiting.
- **Danny & Coops Payroll - Wednesday**, 2:00 PM. The same run, and when no file is waiting and last Sunday's week is neither run nor filed, a Teams card says the file is not in yet (once per day).

The wrapper reads the week from the CSV's Period End, copies the file to `.scratch/danny-coops-payroll/wk<MMdd>`, starts this skill headless with a prompt beginning `Unattended run` naming the week ending, work directory, journal copy, and original file, and writes `done.txt` after, so the week runs once. `-Force` reruns a week, and `-File <csv>` names the file.

No human answers during the run, so:

- Never ask. Use session `dcpu`, and run every command as `cd <work directory> && ...`.
- Build from the journal copy, attach the copy (same name), and file the original.
- An Approved entry already dated the period end means the week was posted by hand: post nothing, and still attach and file if they are missing.
- Any builder stop, a prior-week `--entry` check that does not print `entry matches plan`, or a rejected login fails the run before Duplicate: write `result.json` with `status` `failed` and the reason in `note`, and leave the file in place.
- Duplicate writes the copy the moment it is clicked. A run that fails after it leaves an `NJ000xxxxx` entry behind: name it in `warnings` and leave it unapproved.
- File only after the entry reads Approved with the file attached.

Close `dcpu`, then write `result.json` in the work directory. The wrapper posts it to Teams through `scripts/notify-teams.ps1`, and reports a failure when the file is missing:

```json
{ "weekEnding": "10/4/2026", "status": "approved", "total": 21125.03, "directDeposit": 14571.68, "paperChecks": 2,
  "number": "NJ000xxxxx", "transactionId": "...", "attached": true, "filed": true, "warnings": [], "note": "" }
```

`status` is `approved` or `failed`. The webhook lives in `~/.claude/danny-coops-payroll.json`, outside the repo, in the meat credit's shape: `{"teamsWebhook": "<url>", "mention": {"name": "<name>", "email": "<work email>"}, "mentionWhen": "attention"}`. With `attention` the mention fires only when the entry is not approved, the file is not attached or filed, or a warning is set.

## Danny & Coops R365 quirks

An Approved entry's line grid is read-only until its **Edit** button above the grid is clicked (`button:text-is("Edit")`). The entry stays Approved after the save.


The home dashboard's nav renders with no links for this login, so the Bowery trick of clicking the All Transactions link fails. `all-transactions.sh` routes the SPA with `history.pushState` instead, which only works from a `/react/` page. From any other page it first navigates to the dashboard, which sometimes logs the session out onto an identity-host 404, and re-runs `r365-login.sh` to recover.

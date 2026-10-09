---
name: bowery-pe-tips-recon
description: Zero 210-00 Tips Payable at every Bowery Group store at fiscal period end in Restaurant365, one P<n>'<yy> AJEs journal entry per store clearing the residual balance to 632-00 Credit Card Processing Fees, read from the 210-00 GL Account Detail. Use when asked to run the Bowery period-end tips recon, to clear or check Bowery Tips Payable, or when the payroll run starts it after the period's last payroll.
---

# Period-end Tips Payable recon

Tips reach 210-00 Tips Payable as credits from the daily sales entries (`NJ...`), card tip bank deposits (`BD...`) and the weekly cash log, and leave as debits on each weekly payroll. What remains at period end is the card processing fee withheld from staff on card tips, about 2% of tips collected. Each period, each store's residual moves to 632-00 so Tips Payable ends the period at zero.

Each store is its own legal entity, so each gets its own two-line entry, with the store's location on the header and both lines and blank comments:

| Store | Location |
|---|---|
| Cookshop | 200 |
| Shuka | 400 |
| Rosie's | 500 |
| Shukette | 600 |
| Vic's | 700 |

A credit balance, the usual case, posts **Dr 210-00 / Cr 632-00**. A debit balance reverses it and is worth naming to the human. Bowery Group Corp (800) carries no tips. The first was Cookshop's P9'26 AJEs entry, dated 10/4/2026 at 3,521.16.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365 beyond these scripts.

## The period

Bowery runs R365 Custom Periods of Monday-to-Sunday weeks, twelve per year, some four weeks and some five. FY26 runs 12/29/2025 to 1/3/2027: P9'26 ran 8/31 to 10/4/2026, P10'26 runs 10/5 to 11/1. `scripts/period.js <yyyy-MM-dd>` names the period a Sunday falls in and whether it ends one, from the period end dates in its `FY` table. It exits 2 for a date past the table: copy the next year's period ends from R365's Fiscal Year setup into `FY`, or ask the human for them.

The entry is dated the period end and numbered `P<n>'<yy> AJEs`, the number the period's other adjusting entries share.

## Step 1: wait for the period's last week

The recon runs after the last week of the period is in: that week's Payroll entries approved (the payroll run files its week to `Payroll\Completed\WE <MM.DD.YY>` only then) and its Weekly Log - Deposits, Tips, Paid Outs entries posted. Either one posted later leaves a balance behind. Step 3's builder checks both in the GL.

## Step 2: pull the GL

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh tip
bash <skills>/bowery-sage-ap-begbal/scripts/pull-report.sh tip gl 210-00 8/31/2026 <period end> gl-210.csv
```

Start at 8/31/2026, the Bowery go-live and the account's first activity, so each store's total is its full balance. The report includes unapproved entries, so a period's existing AJEs count.

`pull-report.sh` fails with `no GL Account Detail card` when the session is not on an app page. Reopen `https://bowerygroup.restaurant365.com/react/accounting` with `goto`, log in again, and rerun it.

## Step 3: build the entries

```bash
node <skill>/scripts/build-import.js gl-210.csv "P9'26" 10/4/2026 out
```

It prints each store's balance and side, writes `out/import.csv` in the [payroll import format](../bowery-payroll/MAPPING.md), and writes `out/plan.json`. A store already at zero is skipped; Cookshop in P9'26 reads `skipped, already zero with P9'26 AJEs`.

It prints `STOP:` and writes nothing when the report is not 210-00, a location is unmapped, a line is dated after the period end, a store lacks a Payroll or Weekly Log line dated the period end, or a store already carries this period's AJEs on 210-00 and is still not zero. That last one is a correction for the human. `--no-week-check` skips the final-week check, for a store that genuinely had no payroll or cash log that week.

## Step 4: post

```bash
cp out/import.csv tips.csv
bash <skill>/scripts/import.sh tip tips.csv <entries in plan.json>
```

`import.sh` opens Create > Import Journal Entry, unchecks Beginning Balance, Import as Approved and Payroll Journal Entry, uploads the file, and exits nonzero unless the result reads `Success` with the planned count. The entries land Unapproved.

## Step 5: verify

```bash
bash <skill>/scripts/entries.sh tip "P9'26 AJEs"
bash <skills>/bowery-sage-ap-begbal/scripts/pull-report.sh tip gl 210-00 8/31/2026 <period end> after.csv
node <skill>/scripts/build-import.js after.csv "P9'26" <period end> after
```

Verified means `entries.sh` lists every planned store dated the period end at its `plan.json` amount, and the rebuild prints `total 0.00 in 0 entries`, every store skipped as already zero.

## Step 6: approve

Approve each new entry as soon as Step 5 verifies, with no wait for review, along with any other entry under this period's number on 210-00 still Unapproved:

```bash
bash <skills>/bowery-payroll/scripts/approve.sh tip <TransactionId>
```

`entries.sh` then shows each Approved. Report the store, balance cleared, side, status and id, then close `tip` by name. Leave other sessions open.

## Unattended run

The **Bowery PE Tips Recon** task runs `scripts/pe-tips-run.ps1` (`scripts/register-task.ps1` sets it up, only while signed in). `bowery-payroll`'s `payroll-run.ps1` starts it the moment it files a week, and it also runs Thursday 7:00 PM and Friday 9:00 AM for a payroll filed by hand. It exits quietly unless last Sunday ended a period and that week's payroll sits in `Payroll\Completed\WE <MM.DD.YY>`. When that folder is still missing on Friday, a Teams card says the entries were not posted.

The wrapper works in `.scratch/bowery-pe-tips/P<n>-<yy>`, starts this skill headless with a prompt beginning `Unattended run` naming the work directory, period and period end, and writes `done.txt` so each period runs once. `-Force` reruns and skips the payroll check; `-WeekEnding <yyyy-MM-dd>` names another period end.

No human answers during the run, so:

- Never ask. Use session `tipu`, and run every command as `cd <work directory> && ...`.
- A builder `STOP:` fails the run before import: `status` `failed`, the reason in `note`.
- A plan with no entries, every store already zero, is a success with nothing posted: `status` `approved`, `entries` empty, each store in `skipped`.
- Approve each entry only once Step 5 verifies. Otherwise leave them Unapproved, set `status` to `posted-unapproved`, and name each failing store in `warnings`.
- Name any debit-balance store and any store over 5,000.00 in `warnings`; both still post.

Close `tipu`, then write `result.json` in the work directory. The wrapper posts it to Teams through `scripts/notify-teams.ps1` as the run's confirmation, and reports a failure when the file is missing:

```json
{ "period": "P9'26", "start": "8/31/2026", "end": "10/4/2026", "number": "P9'26 AJEs", "status": "approved", "total": 8012.22, "zeroAfter": true,
  "entries": [ { "location": "Shuka", "amount": 3293.64, "side": "credit", "status": "approved", "transactionId": "..." } ],
  "skipped": [ { "location": "Cookshop", "reason": "already zero with P9'26 AJEs" } ],
  "warnings": [], "note": "" }
```

`status` is `approved`, `posted-unapproved` or `failed`; `zeroAfter` is Step 5's rebuild result. The webhook lives in `~/.claude/bowery-pe-tips.json`, outside the repo, in the same shape as `bowery-payroll.json`: `{"teamsWebhook": "<url>", "mention": {"name": "<name>", "email": "<work email>"}, "mentionWhen": "always"}`. `notify-teams.ps1 -DryRun` prints the card without posting.

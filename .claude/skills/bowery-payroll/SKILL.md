---
name: bowery-payroll
description: Post the weekly ADP payroll journal entries into Bowery Group Restaurant365, one combined hourly-plus-salary entry per location. Use when asked to build, balance, or approve Bowery Payroll entries in R365, to reconcile a Bowery pay period against the ADP General Ledger, or to break out a store's live payroll checks.
---

# ADP payroll period into the Bowery journal entries

ADP delivers two General Ledger workbooks per period covering all six entities, plus one reports zip per entity per pay run. The GL carries every amount; the Net Pay Report inside each zip names the live checks. **One R365 entry per location, hourly and salary combined.**

```
c:\Users\trici\OCRA\TML's Files - General\Downloads\Bowery Group Payroll\
  General Ledger - Hourly.xlsx        every hourly amount, all six entities
  General Ledger - Salary.xlsx        every salary amount, five entities
  <Store> Hourly <client id>-<stamp>-reports.zip
  <Store> Salary <client id>-<stamp>-reports.zip
  Bowery Group <client id>-<stamp>-reports.zip     hourly only, no salary run
```

The Net Pay Reports also arrive saved out of those zips, as loose `<Store> [Hourly|Salary] Net Pay Report <pay date> <stamp> <n>.pdf` in `Downloads`. `extract-checks.sh` reads both shapes, so point it at whichever folder holds them and ask the human if neither does.

Read [`MAPPING.md`](MAPPING.md) before building any amount. It carries the location map, the cash split, the account remap, and the traps that make a balanced entry wrong.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365. It is shared with the Bowery delivery skills, so fix platform behavior there once.

## The period

The GL's **GL Check Date** is the pay date, a Friday. The entry is dated the **period ending**, the Sunday five days earlier, which every report's footer states verbatim as `Period Ending : 09/13/2026 Pay Date : 09/18/2026`. Take the date from that footer rather than counting back from the check date.

## Gather

Work in one directory for the whole run, since `playwright-cli` binds sessions to it.

```bash
node scripts/xlsx-to-csv.js "<folder>/General Ledger - Hourly.xlsx" > gl-hourly.csv
node scripts/xlsx-to-csv.js "<folder>/General Ledger - Salary.xlsx" > gl-salary.csv
bash scripts/extract-checks.sh "<folder>" checks
```

Use this skill's `xlsx-to-csv.js` and no other. The ADP GL writes every blank debit or credit as a self-closing cell, and a converter that drops those shifts whole rows left, landing debits in the credit column. A converted file whose GL Account Number column holds bare numbers rather than `600-10` style codes has been shifted.

`extract-checks.sh` prints `no checks` for a pay run with no live checks, which is normal for most salary runs.

## Build

```bash
node scripts/build-entries.js --hourly gl-hourly.csv --salary gl-salary.csv \
  --checks checks --date 9/13/2026 --out entries
```

One file, `<date> Bowery PAYROLL IMPORT FILE.csv`, holding all six locations, plus `plan.json` for the verify step. [`MAPPING.md`](MAPPING.md) describes the format.

The builder stops rather than emitting anything that fails a check: an entry out of balance, an entry whose total misses the GL total, live checks that exceed a run's net payroll, a parse missing the Net Pay Report's own stated count and total, or a client id with no location mapped.

It also stops when `--checks` is absent. The period posts **with** its live checks broken out, one line per check number, and a missing flag would otherwise bury them in a single line that still balances. `--no-checks` builds without them and has to be asked for.

Confirm each location's total against the GL's `*TOTAL Client ID` line before posting. The six totals summed are the period's grand total.

## Prove the mapping on the prior period first

Apply the build to the **prior** period and compare against that period's approved entries, line by line. A correct mapping reproduces them to the cent, and one run catches a changed ADP file before it reaches half a million dollars of postings.

```bash
bash scripts/dump-lines.sh r365p <TransactionId> "r365-Shuka.json"
node scripts/compare-plan.js prior/plan.json "Shuka=r365-Shuka.json" ...
```

`compare-plan.js` matches on account, side, amount, line location and comment. Three kinds of mismatch are expected and none is an error:

- **Comment wording on the net payroll cash line.** Four of the 9/13 locations carry `NET PAYROLL` and two carry `Direct Deposit` or `Direct Deposits`, along with casing drift like `401K PAYABLE` and `WAGES: FOH-MANAGEMENT`. The builder writes the GL's own name.
- **Leftover zero-amount lines** on an entry built by duplicating a prior week rather than imported.
- **Net payroll taxes split in two** on those same duplicated entries: the 9/13 Cookshop and Shukette entries carry the hourly and salary taxes as two lines that sum to the builder's one.

Anything else is a changed ADP file, so stop and read it.

## Post

Do not import a period that is already posted. Filter All Transactions on Number `Payroll` and read the grid's data source; `R365-AUTOMATION.md` carries the call. Six entries dated the period ending mean the period is done.

Import the file through **Create > Import Journal Entry**, top right of any page. Admin > Import is a different tool with no journal entry type. On a narrow window the search box swallows the top bar, and the X beside it collapses the search to reveal `Create`. The option opens `/#/form/ImportJournalEntryForm/70` in a new tab.

On that form:

1. Uncheck **Beginning Balance** and **Import as Approved**. The entries land Unapproved for the human to approve.
2. Check **Payroll Journal Entry**, which reveals the pay period fields.
3. Type the **Payroll Start Date** (the Monday) and **Payroll End Date** (the period ending Sunday) into `#StartDate` and `#EndDate`, then read both back through their `kendoDatePicker`.
4. Click `Choose File` and hand the CSV to `playwright-cli upload`. Selecting the file starts the import with no further button.

A good import reports `Success` and `6 record(s) created` under Import Result. The upload widget shows a red error icon even on success, so judge by the result line and the read back.

An entry of this size is not worth keying through the grid if the import is unavailable: Shuka alone runs 80 lines.

## Verify

Re-read every posted entry from R365 rather than trusting what the posting step reported, and check three things per location:

1. The **status** is Unapproved until the human approves, and the **amount** on the All Transactions grid matches the planned total.
2. `compare-plan.js` reports a match against `plan.json`, allowing only the expected variances above.
3. The line **count** matches the plan. A short entry is an import that dropped rows.

Report the table of locations, line counts, and totals, and report any location that failed just as plainly.

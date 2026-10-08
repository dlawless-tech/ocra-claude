---
name: bowery-payroll
description: Post, attach, and approve the weekly Paycor payroll journal entries in Bowery Group Restaurant365, one combined hourly-plus-salary entry per location, then file the week folder. Use when asked to build, balance, or approve Bowery Payroll entries in R365, to reconcile a Bowery pay period against the Paycor General Ledger, or to break out a store's live payroll checks.
---

# Paycor payroll period into the Bowery journal entries

Each week's files are dropped loose into the Payroll folder of the Bowery Teams share, and filed into a week folder under `Completed` once the entries are approved:

```
C:\Users\trici\OCRA\Bowery Group - General\Payroll\
  10.04.26 Payroll GL.xlsx                       one GL, hourly and salary combined, all six entities
  10.4 <Store> Hourly Net Pay Report.pdf         one per store, always
  10.4 <Store> Salary Net Pay Report.pdf         only for salary runs with live checks
  Completed\
    WE 10.04.26\                                 every finished week, named for the period ending
```

A complete week is at least six files: the GL plus an hourly Net Pay Report for Cookshop, Rosie's, Shuka, Shukette and Vic's. Salary reports and a Bowery Group report come some weeks and not others. Through 9/27/2026 the files arrived in a `WE <MM.DD.YY>` folder of their own instead; read them from there the same way.

The GL carries every amount and the Net Pay Reports name the live checks. **One R365 entry per location, hourly and salary combined.**

The GL has arrived in two shapes. From 9/27/2026 it is one combined workbook, hourly and salary summed into one row per account. Before that it was `General Ledger - Hourly.xlsx` and `General Ledger - Salary.xlsx`, with the Net Pay Reports inside a `<Store> [Hourly|Salary] <client id>-<stamp>-reports.zip` per pay run. `extract-checks.sh` reads zips and loose PDFs alike. A Net Pay Report whose file name says neither Hourly nor Salary is classed by its own sub-company header, where a salary run reads `SALARY`.

Read [`MAPPING.md`](MAPPING.md) before building any amount. It carries the location map, the cash split, the account remap, and the traps that make a balanced entry wrong.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365. It is shared with the Bowery delivery skills, so fix platform behavior there once.

## The period

The GL's **GL Check Date** is the pay date, a Friday. The entry is dated the **period ending**, the Sunday five days earlier, which every report's footer states verbatim as `Period Ending : 09/13/2026 Pay Date : 09/18/2026`. Take the date from that footer rather than counting back from the check date.

## Gather

Work in one directory for the whole run, since `playwright-cli` binds sessions to it.

```bash
node scripts/xlsx-to-csv.js "<week folder>/09.27.26.xlsx" > gl.csv
bash scripts/extract-checks.sh "<week folder>" checks
```

For the older two-workbook shape, convert each to `gl-hourly.csv` and `gl-salary.csv`.

Use this skill's `xlsx-to-csv.js` and no other. The Paycor GL writes every blank debit or credit as a self-closing cell, and a converter that drops those shifts whole rows left, landing debits in the credit column. A converted file whose GL Account Number column holds bare numbers rather than `600-10` style codes has been shifted.

`extract-checks.sh` prints `no checks` for a pay run with no live checks, which is normal for most salary runs.

## Build

```bash
node scripts/build-entries.js --hourly gl.csv --checks checks --date 9/27/2026 --out entries
```

A combined GL goes in as `--hourly` with no `--salary`, and the builder then draws both runs' live checks against its one net payroll row. The two-workbook shape takes `--hourly gl-hourly.csv --salary gl-salary.csv`.

One file, `<date> Bowery PAYROLL IMPORT FILE.csv`, holding all six locations, plus `plan.json` for the verify step. [`MAPPING.md`](MAPPING.md) describes the format.

The builder stops rather than emitting anything that fails a check: an entry out of balance, an entry whose total misses the GL total, live checks that exceed a run's net payroll, a parse missing the Net Pay Report's own stated count and total, or a client id with no location mapped.

It also stops when `--checks` is absent. The period posts **with** its live checks broken out, one line per check number, and a missing flag would otherwise bury them in a single line that still balances. `--no-checks` builds without them and has to be asked for.

Confirm each location's total against the GL's `*TOTAL Client ID` line before posting. The six totals summed are the period's grand total. The combined GL carries no total lines, so the builder's own GL total check is the tie.

## Prove the mapping on the prior period first

Apply the build to the **prior** period and compare against that period's approved entries, line by line. A correct mapping reproduces them to the cent, and one run catches a changed Paycor file before it reaches half a million dollars of postings.

```bash
bash scripts/dump-lines.sh r365p <TransactionId> "r365-Shuka.json"
node scripts/compare-plan.js prior/plan.json "Shuka=r365-Shuka.json" ...
```

`compare-plan.js` matches on account, side, amount, line location and comment. Four kinds of mismatch are expected and none is an error:

- **Comment wording on the net payroll cash line.** Four of the 9/13 locations carry `NET PAYROLL` and two carry `Direct Deposit` or `Direct Deposits`, along with casing drift like `401K PAYABLE` and `WAGES: FOH-MANAGEMENT`. The builder writes the GL's own name.
- **Leftover zero-amount lines** on an entry built by duplicating a prior week rather than imported.
- **Net payroll taxes split in two** on those same duplicated entries: the 9/13 Cookshop and Shukette entries carry the hourly and salary taxes as two lines that sum to the builder's one.
- **Net payroll split in two by hand** after approval: the 9/27 entries carry each location's `NET PAYROLL` cash line as two lines that sum to the builder's one. Leave the builder's single line as is.
Anything else is a changed Paycor file, so stop and read it.

The prior period's files sit in `Payroll\Completed\WE <MM.DD.YY>\`. A prior period in the other GL shape still proves the mapping, but its line count differs, since the combined GL already sums hourly and salary rows.

## Post

Do not import a period that is already posted. Filter All Transactions on Number `Payroll` and read the grid's data source; `R365-AUTOMATION.md` carries the call. Six entries dated the period ending mean the period is done.

Import the file through **Create > Import Journal Entry**, top right of any page. Admin > Import is a different tool with no journal entry type. On a narrow window the search box swallows the top bar, and the X beside it collapses the search to reveal `Create`. The option opens `/#/form/ImportJournalEntryForm/70` in a new tab.

On that form:

1. Uncheck **Beginning Balance** and **Import as Approved**. The entries land Unapproved, so they can be verified and corrected before the approve step.
2. Check **Payroll Journal Entry**, which reveals the pay period fields.
3. Type the **Payroll Start Date** (the Monday) and **Payroll End Date** (the period ending Sunday) into `#StartDate` and `#EndDate`, then read both back through their `kendoDatePicker`.
4. Click `Choose File` and hand the CSV to `playwright-cli upload`. Selecting the file starts the import with no further button.

A good import reports `Success` and `6 record(s) created` under Import Result. The upload widget shows a red error icon even on success, so judge by the result line and the read back.

An entry of this size is not worth keying through the grid if the import is unavailable: Shuka alone runs 80 lines.

## Verify

Re-read every posted entry from R365 rather than trusting what the posting step reported, and check three things per location:

1. The **status** is Unapproved and the **amount** on the All Transactions grid matches the planned total.
2. `compare-plan.js` reports a match against `plan.json`, allowing only the expected variances above.
3. The line **count** matches the plan. A short entry is an import that dropped rows.

Report the table of locations, line counts, and totals, and report any location that failed just as plainly.

## Attach the week's files

Each entry carries the import CSV plus **that location's own** Net Pay Reports, and nothing else: Rosie's gets both its hourly and salary report, and a location with no Net Pay Report gets the CSV alone. The GL workbook is not attached. `file-week.sh` files a copy of the import CSV with the week.

R365 takes an upload only on a saved entry, which an imported one is. Stage one folder per location under the working directory, since `playwright-cli upload` takes a relative path:

```bash
mkdir -p loc/Shuka && cp "entries/<date> Bowery PAYROLL IMPORT FILE.csv" "<week folder>/9.27 Shuka Net Pay Report.pdf" loc/Shuka/
bash scripts/attach.sh <session> <TransactionId> loc/Shuka
```

`attach.sh` makes the entry's attachments match the folder exactly. It deletes any attachment not in it through the X and R365's **Delete Confirmation** dialog, clicks **Upload File** once per missing file, then reloads and exits nonzero on any mismatch. Each entry takes about two minutes, so run the six in the background.

## Approve

Approve once all six entries match their plan and carry their attachments, and once any line the human asked to change has been changed and read back. Approve in bulk from Accounting > Transactions > All transactions:

1. Filter **Number** to `Payroll` and **Approval Status** to `Unapproved`.
2. Read the grid before selecting. Every row must be one of this run's six entries, dated the period ending, at its planned total. Stop and ask on anything else.
3. Click the select-all box in the header next to Approval Status.
4. Edit Selected > Approve. It approves at once, with no confirmation dialog.

If the bulk approve is unavailable, `scripts/approve.sh <session> <TransactionId>` approves one entry through its ribbon, which takes about a minute. Either way, re-read the grid's data source afterwards: all six rows must read Approved at their planned totals.

## File the week

Once all six entries read Approved, move the week's files into `Completed\WE <MM.DD.YY>`, copy the import CSV in beside them, and create next week's empty folder there, seven days on:

```bash
bash scripts/file-week.sh 10/4/2026 manifest.txt "entries/10.4.2026 Bowery PAYROLL IMPORT FILE.csv"
```

`manifest.txt` lists the original path of each file the run was built from, one per line, so a file dropped for the next week is left alone. The script refuses to overwrite a file already filed and makes the next folder only once every file has moved.

The share syncs to Teams through OneDrive, so the move shows up there for the rest of the team.

Close only the `playwright-cli` session this run opened, by name.

## Unattended run

Two Task Scheduler tasks run `scripts/payroll-run.ps1` (`scripts/register-task.ps1` sets them up):

- **Bowery Payroll - Thursday Watch**, Thursdays every 10 minutes from 8:00 AM to 5:50 PM. It exits quietly until the Payroll folder holds a complete week, as defined at the top, with nothing written in the last 10 minutes, so a trailing salary report lands before the run starts.
- **Bowery Payroll - Thursday**, 6:00 PM. The last check, and a Teams card naming what is missing when the week is still incomplete.

The week ending is the Sunday before the run date; `-Date yyyy-MM-dd` stands in for today. The wrapper copies the files to `.scratch/bowery-payroll/wk<MMdd>/files`, writes `manifest.txt` of the originals, writes `done.txt` so the week runs once (`-Force` reruns it), and starts this skill headless with a prompt beginning `Unattended run` naming the week ending, work directory, file copies, GL workbook and manifest.

No human answers during the run, so:

- Never ask. Use session `bpu`, log it in with `../bowery-doordash/scripts/r365-login.sh bpu`, and run every command from the work directory.
- Build from the copies and attach the copies. Take the date from the reports' footer; a footer that disagrees with the prompt's week ending fails the run.
- Six entries already dated the period ending mean the week was posted by hand: import nothing, and still attach, approve and file what is missing.
- A builder stop, or a prior-period comparison with any mismatch outside the expected four, fails the run before import: write `result.json` with `status` `failed` and the reason in `note`, and leave the files in place.
- A live check numbered with a single digit, like Cookshop's or Shukette's check `1`, is a manual check someone keyed in Paycor. Post it as built and name it in `warnings`.
- After import, approve only when every location passes **Verify** and carries its attachments. Otherwise leave all six Unapproved, set `status` to `posted-unapproved`, and name each failing location in `warnings`.
- File only once all six read Approved, with `file-week.sh` and the prompt's manifest.

Close `bpu`, then write `result.json` in the work directory. The wrapper posts it to Teams through `scripts/notify-teams.ps1`, and reports a failure when the file is missing:

```json
{ "weekEnding": "10/4/2026", "status": "approved", "total": 434285.33, "folder": "WE 10.04.26", "filed": true, "nextFolder": "WE 10.11.26",
  "entries": [ { "location": "Shuka", "status": "approved", "amount": 120000.00, "lines": 80, "checks": 3, "transactionId": "...", "attached": true } ],
  "warnings": [], "note": "" }
```

`status` is `approved`, `posted-unapproved` or `failed`. The webhook lives in `~/.claude/bowery-payroll.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "<name>", "email": "<work email>"}, "mentionWhen": "always"}`. With `always` the mention fires every week; `attention` tags only a run that is not approved, filed and attached, or that carries a warning. `notify-teams.ps1 -DryRun` prints the card without posting.

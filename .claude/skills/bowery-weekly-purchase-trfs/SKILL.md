---
name: bowery-weekly-purchase-trfs
description: Post the weekly purchase transfers journal entry into Bowery Group Restaurant365, moving purchase costs between GL accounts and stores as logged in the GL Reallocation Tracker. Use when asked to fill, balance, or approve the Bowery Purchase Transfers entry in R365, or to check a week's reallocations against the tracker, or when the file-drop or Thursday scheduled run starts it.
---

# Weekly purchase transfers into the Bowery journal entry

The client logs each cost reallocation on the **Reallocations** tab of the GL Reallocation Tracker: Date, From Location, To Location, Description / Reason, Amount, From GL, To GL. This skill copies the prior week's entry and loads that week's rows into it. The tracker arrives each week in the Bowery Teams share:

```
C:\Users\trici\OCRA\Bowery Group - General\Journal Entries\Weekly Purchase Transfers\
  GL_Reallocation_Tracker*.xlsx                      the week waiting to post
  Completed\GL_Reallocation_Tracker <M.D.YY>.xlsx    every posted week's tracker
```

Its name carries no week (the 9/27/2026 file arrived as `GL_Reallocation_Tracker (2).xlsx`), and it is a running log that still holds earlier weeks' rows. Ask the human for the file if none sits at the top of the folder, or if more than one does. The share syncs to Teams through OneDrive.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365, for the login, the side-menu walk to All Transactions, the grid data source, and the new-row form. The duplicate, save, and approve behavior lives in [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) under **Duplicate saves on click**, **A rejected save answers 200**, and **Ribbon buttons are menu openers**.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh pt
```

## The week

The Week Ending is the Sunday after the latest Approved `Purchase Transfers` entry on All Transactions, and the entry is dated that Sunday. The week's rows are those dated in the seven days ending that Sunday. The 9/27/2026 tracker held a 9/20 row, already posted at 230.90, and a 9/26 row of 291.00 for the week.

## Step 1: read the tracker

```bash
node <skill>/scripts/read-tracker.js "<tracker>" <M.D.YY> > lines.json
```

It reads rows 5 down to the `Total logged:` row, maps each location to its R365 name, and turns each row into two entry lines: a credit to the From GL at the From location and a debit to the To GL at the To location. Rows that land on the same side, GL, and location add into one line. Rows dated outside the week go to `skipped`; check each against an entry already posted. It stops when the week ending is not a Sunday, a location is unknown, a GL is missing from the **GL Expense Accounts** tab, a row moves a GL onto itself, the tab has no `Total logged:` row, all rows together miss its amount, or the week logs no rows. A week with no rows posts no entry; report that.

| Tracker   | Location                 |
|-----------|--------------------------|
| Cookshop  | 200 - Cookshop           |
| Shuka     | 400 - Shuka              |
| Rosie's   | 500 - Rosie's            |
| Shukette  | 600 - Shukette           |
| Vic's     | 700 - Vic's              |
| Bowery    | 800 - Bowery Group Corp  |

`total` in `lines.json` is the entry amount the All Transactions grid shows. The tracker's Entered by, R365 JE #, Accountant Signoff, Date Entered, and Status columns are the client's log and do not feed the entry.

## Step 2: the entry

`bash <skill>/scripts/all-transactions.sh pt` lists the latest entries as date, status, amount, number, and id. It filters All Transactions through the grid's data source on Number `Purchase Transfers`. Since 9/13/2026 each week carries one Journal Entry numbered exactly that, header location `600 - Shukette`, with blank line comments. The 9/13 and 9/20/2026 entries each ran one row, the weekly NA Gazoz cost at Shukette:

```
credit  510-01 - Purchases-Beverage Liquor   amount   600 - Shukette
debit   510-04 - Purchases-Beverage N/A      amount   600 - Shukette
```

An Approved entry dated the Week Ending means the week is done; stop and report it.

## Step 3: duplicate the prior week

`bash <skills>/bowery-weekly-cash-log/scripts/duplicate.sh pt <prior id> <M/D/YYYY> "Purchase Transfers"` runs this whole step and prints the new id; it ran the 10/4/2026 week. By hand: open the prior week's entry at `https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/<TransactionId>` and use **Action > Duplicate**. A dialog asks `Duplicate transaction and attachments?`; answer **No, transaction only**, so the prior week's tracker stays off the new entry. The copy is written to the server on that click, opens in a second tab (`tab-select 1`), numbered `NJ000xxxxx` and dated today. `fill` then `press Tab` on `#journalEntryDate` (the Week Ending) and `#journalEntryNumber` (`Purchase Transfers`), read both back, and save once before touching lines:

```bash
bash <skills>/danny-coops-payroll/scripts/save.sh pt
```

A committed save prints `[["1","<id>"," "],["1",""]]`. Record the new id from it.

When no row this week touches Shukette, set the header location to `headerLocation` from `lines.json`, the first row's From location.

## Step 4: set the lines

```bash
node <skill>/scripts/set-lines.js lines.json > set.js
playwright-cli -s=pt eval "$(cat set.js)"
```

It keys each entry line by side, GL, and location, gives every line its week's amount, and clears the comment. It returns `set N lines, debits X credits X` with X equal to `total`.

When the week's lines and the entry's differ, it changes nothing and returns one instruction per difference:

- `ADD <side> <amount> <GL> @ <location>` for a line the entry lacks. Add it through the new-row form under the grid, setting the location to the one named.
- `REMOVE <side> | <GL> | <location>` for a line the week lacks. Delete it with its trash icon.

Then rerun `set-lines.js` until it reports `set`. A `STOP:` names a zero line or two lines on one key; read it before going further. Save with `save.sh` and read the body.

## Step 5: attach the tracker

Every entry carries the tracker it was built from, copied under the week's name. A real click on **Upload File** in the line grid's attachment panel opens a file chooser, which `playwright-cli upload` answers with a path relative to the working directory:

```bash
cp "<tracker>" "GL_Reallocation_Tracker <M.D.YY>.xlsx"
playwright-cli -s=pt click <button "Upload File" ref>
playwright-cli -s=pt upload "GL_Reallocation_Tracker <M.D.YY>.xlsx"
```

`bash <skills>/danny-coops-payroll/scripts/attach.sh pt "GL_Reallocation_Tracker <M.D.YY>.xlsx"` does both on a reloaded entry and prints `attached <name>`. Take the Upload File ref from a snapshot of a freshly reloaded entry; a snapshot taken right after a save can come back partial and without the button. The upload lands on its own, with no save. It is done when the tracker's link shows in the panel after a reload.

## Step 6: verify and approve

Reload the entry by its id and compare the server copy against the tracker:

```bash
playwright-cli -s=pt eval "$(cat <skills>/bowery-weekly-mgmt-fees/scripts/read-lines.js)" > readback.txt
node <skill>/scripts/check-lines.js lines.json readback.txt
```

It prints `MATCH` only when the date is the Week Ending, the number is `Purchase Transfers`, the entry holds exactly the week's lines, debits equal credits at `total`, and every line sits on its side, GL, and location at its amount. A third argument checks a different number, such as a test entry's.

Approve through a real click on `#Approve > a` then `li[data-testid="approveAndCloseMenuItem"]`, and confirm `"Successfully Approved."` in the `Transaction/Approve` response. The approve closes the entry's tab and its request log with it, so when the response is gone, reload the entry by id and read `Approved` in its snapshot. The week is done when the All Transactions grid, after `dataSource.read()`, shows the Week Ending's `Purchase Transfers` row Approved at `total`. `bash <skill>/scripts/approve.sh pt <id> <M/D/YYYY>` clicks through and reads that row, failing unless it is Approved. A `hover` on `#Approve > a` followed by the menu item click left the 10/4/2026 entry Unapproved; the real click on `#Approve > a` opens the menu.

## Step 7: file the tracker

Once the entry is approved with the tracker attached, move the tracker into `Completed` under the week's name:

```bash
P="/c/Users/trici/OCRA/Bowery Group - General/Journal Entries/Weekly Purchase Transfers"
mv -n "$P/<tracker>" "$P/Completed/GL_Reallocation_Tracker <M.D.YY>.xlsx"
```

`bash <skill>/scripts/file-week.sh "<tracker>" <M.D.YY>` does the same and refuses to overwrite. Confirm it no longer sits at the top of the folder. A week that stops before approval leaves its tracker in place. Close the session with `playwright-cli -s=pt close`.

Report the `check-lines.js` table, each row's Description / Reason, the `skipped` rows, the entry's status and amount from the grid, and whether the tracker is attached and filed.

## Unattended run

Two Task Scheduler tasks run `scripts/purchase-trfs-run.ps1` (`scripts/register-task.ps1` sets them up, only while signed in):

- **Bowery Purchase Transfers - File Drop**, every 15 minutes from 6:00 AM to 10:00 PM daily. It looks for one `GL_Reallocation_Tracker*.xlsx` at the top of the folder, at least 2 minutes old so a syncing file is skipped, and exits quietly when none is waiting.
- **Bowery Purchase Transfers - Thursday**, 10:00 AM. The same run, and when no tracker is waiting and last Sunday's tracker is not in `Completed`, a Teams card says it is not in yet (once per day).

More than one tracker waiting posts a card and runs nothing. The wrapper copies the tracker into `.scratch/bowery-purchase-trfs/run-<file timestamp>`, starts this skill headless with a prompt beginning `Unattended run` naming the work directory, tracker copy, original file, and today, and writes `done.txt`, so each version of the file runs once. A replaced tracker runs again. `-Force` reruns, and `-File <xlsx>` names the file.

No human answers during the run, so:

- Never ask. Use session `ptu`, and run every command as `cd <work directory> && ...`.
- Take the week from the grid as in **The week**. A Week Ending after today fails the run.
- Read the tracker copy. A `read-tracker.js` stop fails the run before Duplicate: write `result.json` with `status` `failed` and the reason in `note`, and leave the tracker in place.
- A week with no rows posts nothing: `status` `no rows`, and file the tracker.
- An Approved entry already dated the Week Ending means the week was posted by hand: post nothing, report it as `approved` with its total, and still attach and file if they are missing.
- Duplicate writes the copy the moment it is clicked. A run that fails after it leaves an `NJ000xxxxx` entry behind: name it in `warnings` and leave it unapproved.
- Approve only on `MATCH` with the tracker attached, and file only after `approve.sh` passes.
- Each `skipped` row should sit in an earlier Approved entry; name any that does not in `warnings`.

Close `ptu`, then write `result.json` in the work directory. The wrapper posts it to the Wkly Journal Entries Teams channel through `scripts/notify-teams.ps1`, and reports a failure when the file is missing:

```json
{ "weekEnding": "10/4/2026", "status": "approved", "total": 219.00, "number": "Purchase Transfers", "transactionId": "...",
  "rows": [{ "date": "10/4/2026", "desc": "NA Gazoz", "amount": 219.00, "from": "510-01 @ 600 - Shukette", "to": "510-04 @ 600 - Shukette" }],
  "attached": true, "filed": true, "warnings": [], "note": "" }
```

`status` is `approved`, `no rows`, or `failed`. The webhook lives in `~/.claude/bowery-purchase-trfs.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "Brandy Sanders", "email": "<work email>"}, "mentionWhen": "always"}`. With `always`, Brandy is tagged on every card, as the confirmation.

## Test entries

A test run numbers the copy `Purchase Transfers TEST` and stops short of approving. Delete it afterward through **Action > Delete** and answer **Yes** to `Are you sure you wish to delete?`; the tab closes on success. The page carries a disabled Theme Builder `Delete` button ahead of the Action menu's, so take the enabled one. Confirm no `TEST` row remains on All Transactions. First run 9/25/2026 against the 9/20/2026 week, duplicating the 9/13 entry, which matched on every line with the tracker attached.

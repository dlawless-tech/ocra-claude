---
name: norms-ezcater
description: Enter the NORMS EZ Cater Fees journal entries into Restaurant365, one per store with EZ Cater activity in the two-week window, clearing 1118 EZ Caterer Receivable against 5514 Online Ordering Expense, 5915 Delivery over Short and, for orders missing from R365, 4010 Food Taxable, from the EZ Cater Completed Orders report, then report to Regina in Teams. Use when asked to enter, post, or approve the NORMS EZ Cater entries in R365, to pull the NORMS EZ Cater orders report, or to check 1118 against EZ Cater payments, or when the Friday scheduled run starts it.
---

# EZ Cater orders into the NORMS EZ Cater Fees entries

Four steps: **read** the window's EZ Cater orders report and the 1118 GL detail, **plan** each store's lines with `plan.js` and `entries.js`, **enter** one entry per store, then **report** to Teams. Entries are saved unapproved; approval waits for the human.

Run from one directory for the whole run, `.scratch/norms-ezcater/we<MMdd of window end>`. `playwright-cli` binds sessions to the working directory, and a `cd` mid run strands them. `<skill>` below is this folder, written absolute.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting R365. It is shared with the other NORMS skills, so fix R365 platform behavior there.

## Logins

Credentials live in `~/.claude/norms-credentials.md` under `## EZ Cater` and the R365 block.

```bash
bash <skill>/scripts/ez-login.sh nez     # EZ Cater Partner Portal
bash <skill>/scripts/r365-login.sh nezr  # R365, entries
bash <skill>/scripts/r365-login.sh nezb  # R365, GL report
```

EZ Cater emails a code to mark@ocra-us.com for a new device. `ez-login.sh` runs the session on the saved profile `~/.claude/playwright-profiles/norms-ezcater`, where **Remember this device for 30 days** keeps the device known between runs. On the code page it ticks that box and exits 2: the code is for the human, typed into that same window.

## The window

Entries run in **two-week windows, Sunday to Saturday**, dated the **Saturday the window ends**, numbered `EZ Cater Fees`, one per store. 9/5/2026 was the first per-store set (8/9 to 9/5) and 10/3/2026 the last four-week one (9/6 to 10/3); two-week windows start with 10/4 to 10/17/2026. Earlier sets (6/14, 7/11, 8/8) were single Support Center entries.

EZ Cater pays each store weekly by Payoneer, landing on 1118 as a Bank Deposit `PAYONEER ... ezCater Payment store <n>` on Tuesdays.

## Read

**Orders report.** `bash <skill>/scripts/ez-report.sh nez <start> <end> ez.csv` creates a Completed Orders report named `NORMS EZ Cater <M.D>-<M.D>.<yy>` for every ` - Norms - ` store (24, leaving Cornbread and Isle of Us out), downloads it into `ez/` and converts it. The store picker is a jQuery multiSelect and the dates are jQuery UI datepickers set through `setDate`; `fill` does not take on either. EZ store names match R365 locations except `Ontario Mills` (270 - Ontario) and `S. Torrance` (223 - South Torrance).

**R365 sales, D.** The daily journal entries debit `1118 - EZ Caterer Receivable` with each EZ Cater order, at the POS figure, which rarely equals EZ's food plus tax. In `nezb`, Reports > My reports, GL Account Detail card, Customize; `eval "$(cat <skill>/scripts/gl-params.js)"` sets account 1118 and Subtotal By Location. Start the window's first day, End today (the balance check needs the payouts after the window), against fresh snapshot refs. Click the dialog's Run (`exportMenu`), then on the report tab:

```bash
bash <skill>/scripts/snapshot.sh nezb gl.txt
grep -oE 'cell "[^"]*"' gl.txt | sed 's/^cell "//; s/"$//' > gl.cells
node <skill>/scripts/gl-parse.js gl.cells > gl.json
```

Check the parse sums to the report's Grand Total.

**Source entries.** In `nezr`, soft navigate to All Transactions from the home dashboard and `eval "$(cat <skill>/scripts/sources.js)"`, saving the output lines as `sources.txt`: each store's latest EZ Cater Fees entry as `<location>|<TransactionId>`. A store with none copies Claremont's.

## Plan

```bash
node <skill>/scripts/plan.js ez.csv gl.json <start> <end> > plan.json
node <skill>/scripts/entries.js plan.json sources.txt <end> > entries.json
```

| Comment | GL | Amount |
|---|---|---|
| `r365 ez cater debit balance - caterer total due` | 1118 - EZ Caterer Receivable | D - Caterer Total Due, credit if positive |
| `total - caterer total due` | Dr 5514 - Online Ordering Expense | Commission + Payment Transaction Fee |
| (blank) | 5915 - Delivery over Short | the rest, debit if positive |
| `ez cater orders missing from r365 sales` | Cr 4010 - Food Taxable | missing orders' Caterer Total Due + fee |

The 5514 rule reproduces every 9/5/2026 entry where R365 and EZ agreed. Preferred Partner Program, Rewards, the Delivery Fee and its matching Misc Fees, and Sales Tax Remitted by ezCater (Las Vegas) fall into 5915.

`plan.js` pairs each R365 sale with the nearest EZ order a day before to five after. An order with no R365 sale is **missing sales** and goes to 4010; the 4010 row is added only when a store has one. A sale R365 booked short or long stays in 5915. Account and location ids live in `locations.json`.

Each store's 1118 must zero once its window's payouts are coded. `plan.js` warns on every store whose `balAfter` is not zero: a payout not coded yet, or a leftover from an earlier entry (Las Vegas carried -90.10 from 9/5/2026, cleared on 10/3/2026 against 4010). Report the warning; correct a leftover only on the human's word.

## Enter

```bash
bash <skill>/scripts/enter-entry.sh nezr entries.json "<location>|<end>"
```

One store per call: Duplicate the source (which saves an `NJ...` copy at once), answer "No, transaction only", set date and number, set every line's account, comment, amounts and the store's location, save, read the `SaveTransaction` body, reload and read back every line. It prints `<key> SAVED <id> <amount>` and leaves the entry unapproved. `EDIT=<id>` rewrites an unapproved entry in place. A failure after Duplicate leaves an `NJ` copy to delete.

## Approve

On the human's go: All Transactions, filter Number `EZ Cater Fees` and Approval Status Unapproved, check every row is this run's, select all, Edit Selected > Approve, then re-read the grid.

## Report

Write `result.json` in the work directory and post it with `scripts/notify-teams.ps1 -Title "NORMS EZ Cater Fees, sales <start> - <end>" -ResultFile result.json` (`-DryRun` prints the card). It posts to the NORMS TPD channel and tags Regina Leong, from `~/.claude/norms-ezcater.json` outside the repo. Every missing order goes into `missingSales`.

```json
{ "window": "9/6/2026 - 10/3/2026", "entryDate": "10/3/2026", "mode": "entered (unapproved)", "note": "",
  "stores": [ { "store": "272 - Las Vegas", "status": "entered", "fee": 243.70, "difference": 0, "transactionId": "...", "warnings": [] } ],
  "missingSales": [ { "store": "272 - Las Vegas", "order": "U48-X2K", "date": "9/11/2026", "food": 127.39, "due": 100.26 } ] }
```

Close the sessions this run opened, by name: `for S in nez nezr nezb; do playwright-cli -s=$S close; done`. Leave every other session alone.

## Unattended run

`scripts/friday-run.ps1` runs from Task Scheduler every other Friday at 3:00, first on 10/23/2026 (`scripts/register-task.ps1` sets it up). It works every two-week window ending a Saturday from 10/17/2026 that ended at least six days earlier and has no `done.txt` in its work directory, oldest first. It starts this skill headless with a prompt beginning `Unattended run` that names the window, the work directory and the entry date.

No human answers during the run, so:

- `cd` into the work directory once, before opening any session, and run every command from there. Use session names `nezu` (EZ Cater), `nezru` (entries) and `nezbu` (GL report).
- Never ask. When `ez-login.sh` exits 2, leave `nezu` open on the code page, write `result.json` with `"stores": []` and `"note": "EZ Cater mailed a code to mark@ocra-us.com"`, close `nezru` and `nezbu`, and stop. The wrapper posts a waiting card; once the human types the code into that window, running `friday-run.ps1` again picks the window up.
- Enter every store; leave every entry unapproved. A store whose entry fails a check is `failed`, with the failing step in `warnings`, and the others carry on. Every `plan.js` warning goes into that store's `warnings`, and every missing order into `missingSales`.

Finish by closing the sessions by name, then write `result.json` with `"mode": "entered (unapproved)"` and each store `"status": "entered"`. The wrapper posts it to Teams, tagging Regina, and marks the window done.

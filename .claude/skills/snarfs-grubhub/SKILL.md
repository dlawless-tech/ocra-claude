---
name: snarfs-grubhub
description: Post each week's Grubhub fees into the matching Snarf's Sandwiches Restaurant365 (snarfsstl) journal entries, one per store, from Grubhub's transactions for the Tuesday-to-Monday period, clearing 10125 GrubHub Receivable against 70450 GrubHub Fees and 42060 Customer Refund, with a tie-out backup PDF attached to each. Use when asked to post, balance, review, or approve the Snarf's GrubHub entries in R365, to pull a Snarf's store's Grubhub figures, or to check past Snarf's GrubHub entries against Grubhub, or when the Wednesday scheduled run starts it.
---

# Grubhub fees into the Snarf's journal entries

Same design as `bowery-grubhub`: **gather** every figure first, from Grubhub and from one GL report, then **post** the entries and attach their backup. `<scripts>` is this skill's `scripts/` folder. Run every command from the repo root, since `playwright-cli` binds sessions to the working directory, and keep working files in `.scratch/snarfs-grubhub/wk<MMDD>/`.

Sessions, named so they never touch the DoorDash (`sdd`), advance orders (`snf`, `snt`) or another client's browsers:

```bash
playwright-cli -s=sgh open --headed https://restaurant.grubhub.com/login   # Grubhub
bash <scripts>/r365-login.sh sgj                                            # journal entries
bash <scripts>/r365-login.sh sgb                                            # GL report
```

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting anything else in R365. Close only these sessions when the run ends.

## Logins

Both live in `~/.claude/snarfs-credentials.md`: R365 under its heading (user tlaroche), Grubhub under `## Grubhub` (mark+04@ocra-us.com). Grubhub takes email and password at `restaurant.grubhub.com/login`; fill `textbox "Username or email address"` and `textbox "Password"`, then click Sign in. One login covers every store. If Grubhub asks for a mailed code, hand the keyboard to the human.

## The period

Tuesday to Monday, Central time. The entry is dated the **Sunday inside the period**: 10/6-10/12/2026 posts to the 10/11 entry. A period that crosses month end splits into two entries, exactly as in `bowery-grubhub`'s **Month end splits the period**: the part through the last day of the month posts to an entry dated that day (9/30/2026 for 9/29-9/30), the rest to the Sunday entry. R365 pre-creates only the Sunday entry; `<scripts>/duplicate-entry.sh sgj <prior entry id> <M/D/YYYY>` makes the month-end one.

## Stores

`<scripts>/stores.json` maps each Grubhub restaurant to its R365 location: MX 10100, Page 10200, Skinker 10300, SLU 10400, Fenton 10700, Kirkwood 10800.

Spirit (10900) is outside the Grubhub login and runs from R365 alone; see **Spirit**.

## Spirit

Each Spirit entry is two lines without comments: credit 10125, debit 70450, both the period's fees. The fees are the period's DSS debits **D** less the Grubhub deposit that pays them. The deposit lands the Friday after the period, so each run does two things:

1. **True up** the prior period's entry to actual, D less its deposit.
2. **Estimate** the period just ended at the trailing rate: fees over D for the last 8 periods with an actual.

```bash
ACCT="10125 - GrubHub Receivable" bash <scripts>/gl/gl-detail.sh sgb <start M/D/YYYY, ~12 weeks back> <today M/D/YYYY> $W/gl-spirit.csv
node <scripts>/spirit.js $W/gl-spirit.csv <start YYYY-MM-DD> <today YYYY-MM-DD> <Spirit entry dates, comma separated> > $W/spirit.json
node <scripts>/spirit-work.js $W/spirit.json <entry date YYYY-MM-DD> $W/entry-Spirit.json
```

The GL runs through today so it holds the deposits. `spirit.js` matches each deposit to the unpaid parts that ended 1 to 10 days before it, closest to 85% of their D. One deposit can pay two parts, since Grubhub sometimes pays month-end days with the week before (7/3/2026 paid 6/23-6/30). Each part comes back `actual`, `estimate`, `no sales`, or `no deposit` (fees = D, the whole sale written off; report it). Pass the dates of the Spirit entries that exist, and a month-end part with no entry folds into its period's other part. Through 10/4/2026 the actuals sum to the fees posted, which is the check that the matching holds.

`spirit-work.js` keys the two lines by their account, which `post-entry.sh` accepts in place of a comment, and puts negative fees (the deposit above D) on the opposite sides. Post with `post-entry.sh` and the location fragment `Spirit`.

## Phase 1: the Grubhub figures

```bash
sed -e 's/__START__/2026-10-06/' -e 's/__END__/2026-10-12/' <scripts>/transactions.js > $W/tx.js
playwright-cli -s=sgh eval "$(cat $W/tx.js)" | sed -n '/### Result/,/### Ran/p' | sed '1d;$d' > $W/raw.json
node <scripts>/figures.js $W/raw.json 2026-10-06 2026-10-12 > $W/figures.json
```

`transactions.js` pulls every transaction for every store from the API behind Financials > Transactions, in Central time. `figures.js` totals each store into the entry's categories, in dollars: `net` (the deposit Grubhub pays the Wednesday after), `gross`, and `cat` holding commissions, delivery commissions, order processing fees, rewards, targeted promotions, refunds and account adjustments. `check` is 0 for every store, meaning gross less every category equals net to the cent.

- A **refund** books at the order's gross, and the fees Grubhub hands back on it come off the fee lines. This is the convention the entries were built on (Page 10/11/2026: refund 27.38, net 23.20).
- `DISTRIBUTION` rows are Grubhub paying out an earlier period and are skipped.
- A `CS_CREDIT` or a withheld fee with no column of its own lands in account adjustments.

## Phase 2: the period debits

The Daily Sales Summary debits `10125 - GrubHub Receivable` each day with that day's Grubhub sales. The period's debits per location are **D**:

```bash
bash <scripts>/gl/gl-detail.sh sgb 10/6/2026 10/12/2026 $W/gl.csv
node <scripts>/gl/gl-days.js $W/gl.csv > $W/gldays.json
```

`gl-detail.sh` runs GL Account Detail for 10125 (set `ACCT` for another account), all locations, Subtotal By Location, Show Unapproved Yes, and prints `saved <file>` or a `FAIL:` line. `gl-days.js` gives each location's `D`, beginning balance and Journal Entry debits by day.

## The entry

Each store's template carries a line per category, keyed by its comment, and the comments vary by store (`refund` or `refunds`, `discrepancy`, `discrepancies` or `difference`). `<scripts>/read-entry.sh sgj <id>` prints the entry's lines; `plan.js` matches each comment to its category and writes the store's work record:

```
credit 10125 "ar balance - deposit total"  =  D - net
debit  70450 commissions, delivery commissions, order processing fees, rewards, targeted promotions, account adjustments
debit  42060 refund(s)
       42060 discrepancy                   =  (D - net) - everything above, debit if positive
```

```bash
node <scripts>/plan.js $W/figures.json Page <D> $W/entry-Page.json
```

It prints `{loc, id, tot, lines, warnings}`, or `{fail}` when the template lacks the 10125 or discrepancy line. A category with no template line goes on commissions (fees) or the discrepancy line (refunds) and is named in `warnings`. Collect the records into one `work.json` array.

The discrepancy is the gap between what the DSS booked and what Grubhub recorded, a few cents in a typical period. A dollar figure gets a cause before approving: set the store's `days` from `figures.json` beside its daily debits in `gldays.json`, and look at its `odd` rows. Name the cause per store in the report.

## Finding the entries

Accounting > Transactions > All transactions (side menu clicks in `R365-AUTOMATION.md`), filter Number contains `Grub`, and harvest every entry and TransactionId from the grid's data source in one call. Every store has one entry per Sunday, numbered `GrubHub`, which arrives as an Approved template.

## Posting

```bash
ENTRY_DATE=10/11/2026 bash <scripts>/post-entry.sh sgj Page $W/work.json
```

It unapproves an Approved entry and prints the lines it held, overwrites every template line with this run's figure, checks each typed amount reads back, checks both sides sum to `tot`, saves, reloads, confirms the values survived, then Approves with the plain Approve item (Approve and Close does nothing in this instance). It refuses to approve on any failed check. Give parallel workers their own session names.

## Backup on every entry

One PDF per entry named `GrubHub <store> <MM.DD> backup.pdf`. Page one ties the posted entry to Grubhub: D less net against the posted credit, each category, the discrepancy, R365 against Grubhub by day, and the refund and adjustment rows. The pages after list every Grubhub transaction in the window.

1. Plan file per entry: `{entryDate, store, location, status, window, lines, glDays, orders, note}`, where `lines` are `[account, debit, credit, comment]` read back from the saved entry, `glDays` is the location's `days` from `gldays.json`, and `orders` is the store's record from `figures.json`.
2. `node <scripts>/backup/build-backup.js plan.json <id>.html` prints `ties` or `DOES NOT TIE`. Stop on the second.
3. `bash <scripts>/backup/render-pdf.sh <html dir> <id> <out.pdf> ...` prints each PDF's size; under 1 KB is a blank page.
4. After approving, put each PDF alone in a folder and run `bash .claude/skills/bowery-payroll/scripts/attach.sh sgj <TransactionId> <folder>`. It deletes any attachment not in the folder, so list the entry's attachments first and keep the preparer's existing files by copying them into the folder too.

## Verifying the run

Refilter the All Transactions grid and read each entry back from the data source: status **Approved**, amount matching the planned `tot`, and the backup in `Attachment`. Report the table of stores, Grubhub nets, amounts, discrepancies and backups, and report a failed store just as plainly.

## Reviewing past entries

To check every entry since a date against Grubhub, pull Grubhub from the Tuesday before that date to the last Monday, and the GL for 10125, 70450 and 42060 over the same span into one folder as `gl-<account>.csv`, then:

```bash
node <scripts>/review.js $W/raw.json $W 2026-01-01 > $W/review.json
```

Each record gives the entry's window, the A/R credit, fee total and discrepancy posted against expected, the categories that differ (`catDiff`), and the refund rows. Read it in this order:

1. **The 10125 balance.** At the last Monday each store's balance equals that week's Grubhub net, the deposit still to come. A store that does not tie names the entry to fix, an A/R credit off by the same amount.
2. **Month-end pairs.** Entries before 7/2026 cut the fees at month end and the A/R credit at the period, so the discrepancy swings one week and reverses the next (3/29 and 4/5, 6/28 and 7/5). A pair that nets to zero is timing only.
3. **Classification.** A fee in `catDiff` sitting on the discrepancy line, or a refund on a fee line, moves cost between 70450 and 42060 with no effect on the receivable.
4. **Recurring discrepancies.** A few dollars a week at Skinker and SLU is the DSS booking more than Grubhub recorded. Hundreds in one week is a DSS posted twice; compare the store's daily debits in the GL to `days`.

Report the findings before correcting anything; an approved entry is changed only when the human says so.

## Unattended run

`<scripts>/wednesday-run.ps1` runs from Task Scheduler on Wednesdays at 13:00 (`<scripts>/register-task.ps1` sets it up). It takes the period that ended Monday, writes `started.txt` in the work directory so a period runs once (`-Force` reruns, `-Date yyyy-MM-dd` stands in for today), and starts this skill headless with a prompt beginning `Unattended run`, naming the work directory and each part with its sales window and entry date.

No human answers during the run, so:

- Use session names `sghu`, `sgju` and `sgbu`, so an interactive run's sessions are left alone.
- A Grubhub mailed-code challenge or a rejected login fails the whole run: write `result.json` with the reason in `note` and post nothing.
- Per store, unapprove, update with this run's figures, save and approve, whatever the entry held. When it already carried different amounts, put the prior lines in `warnings`. For a part marked new entry, look on the grid for a GrubHub entry at that date and location first and update it rather than duplicating. A store that fails a **Posting** check is `failed`, with the failing step in `warnings`, and the others carry on.
- A store with sales in R365 and no Grubhub transactions is `no-orders` and posts nothing, with the sales amount in `warnings`. A store with neither is left out.
- A dollar discrepancy, a `plan.js` warning, or a backup that does not tie or attach goes in `warnings`.
- Spirit: true up the prior period's entry to actual and post the estimate for this one, per **Spirit**. A prior period with no deposit yet stays at its estimate and goes in `warnings`. Spirit is the one place a run changes a prior period.
- Never correct any other approved prior period; report it.

Finish with **Verifying the run**, close the sessions by name, then write `result.json` in the work directory. The wrapper posts it to Teams through `<scripts>/notify-teams.ps1`, and reports a failure when the file is missing:

```json
{ "period": "10/6/2026 - 10/12/2026", "note": "",
  "entries": [ { "date": "10/11/2026", "window": "10/6-10/12",
      "stores": [ { "store": "Page", "status": "approved", "amount": 70.42, "net": 147.06, "transactionId": "...", "warnings": [] } ] } ] }
```

`status` is `approved`, `no-orders`, `posted-unapproved`, or `failed`. The webhook lives in `~/.claude/snarfs-grubhub.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "<name>", "email": "<work email>"}, "mentionWhen": "always"}`.

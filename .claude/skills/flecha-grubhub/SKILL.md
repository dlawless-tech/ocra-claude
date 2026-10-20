---
name: flecha-grubhub
description: Post the weekly Grubhub fee journal entries into Flecha Restaurant365, one per store, from 1242 - AR - GrubHub to 7161 - Delivery Fees, estimating the Tuesday-to-Monday period just ended from each store's historical fee rate and truing up the prior period's estimate to its sales less the Grubhub deposit, read from the GL Account Detail report. Use when asked to post, balance, or approve the Flecha GrubHub entries in R365, or to check a Flecha store's Grubhub sales against its deposits.
---

# Flecha Grubhub fees, weekly by store

There is no Grubhub portal access for Flecha, so the fee is the **gap in the GL**: a store's Grubhub sales for one period, less the Grubhub deposit that lands after it. That deposit arrives after the period is booked, so each period is posted twice:

- **Estimate**, in the run right after the period ends: sales × the store's fee rate over its last 4 settled periods with sales, total fees ÷ total sales. A store with no history uses the all-store rate.
- **True-up**, in the next week's run, once the deposit has landed: the same entry reset to sales less deposit.

Each weekly run therefore trues up last week's entry and estimates this week's. Every period carries one Journal Entry per store, four in all, numbered `GrubHub`, both lines at the store:

```
credit  1242 - AR - GrubHub     fee
debit   7161 - Delivery Fees    fee
```

Header and both line comments name the basis: an estimate reads `GrubHub fees estimate: sales 10/1-10/5 91.97 x 26.55% (2 period avg)`, an actual reads `GrubHub fees: sales 9/1-9/7 208.70 less 9/11 deposit 153.32`. A store with no Grubhub sales gets its entry at 0.00, Approved; NB had no Grubhub activity at all through October 2026. The September 2026 entries predate the comments and carry none.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it, and use the session name `flgh` so other skills' browsers are left alone:

```bash
bash .claude/skills/flecha-weekly-mgmt-fees/scripts/r365-login.sh flgh
```

Flecha shares the NORMS R365 login (`tlaroche`), read from `~/.claude/norms-credentials.md`. Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting anything new here; the same R365 build serves Flecha.

## The period

Grubhub runs **Tuesday to Monday** and cuts off at month end. The entry is dated the **Sunday** inside the period: the 9/6/2026 entry is sales 9/1 to 9/7. The deposit lands the **Friday after the period ends**, so 9/1 to 9/7 settles on 9/11.

A period that crosses month end splits: the part through the last day of the month posts to its own entry dated that day, and the rest to the Sunday entry. Period 9/29 to 10/5/2026 split into a 9/30 entry for 9/29 to 9/30 and the 10/4 entry for 10/1 to 10/5. Both the stub and the full week before it settle on the same Friday (10/2/2026 carried the 9/22-9/28 deposits for HB and Town Square and the 9/29-9/30 deposit for 4S Ranch). `build.js` gives each deposit to the latest period ending before it that still has open sales for that store, which sorts this out; it flags `CHECK DEPOSIT MATCH` when two open periods could own one deposit, and then match it by amount.

So a run in the week after a month-end split has two entry dates to estimate (the stub and the Sunday), and the following run has two to true up.

## Step 1: GL detail

```bash
bash <skill>/scripts/gl-1242.sh flgh <eight weeks back> <today> > gl.txt
```

It opens GL Account Detail for 1242 across all Flecha entities with Show Unapproved Yes, by its report URL in a new tab, and prints the rows. Show Unapproved matters: a Daily Sales Summary still unapproved is a real day of sales. Pull from eight weeks back so every store has 4 settled periods for its rate; the earliest deposits then settle periods before the window and print as `deposits matched to no period`, which is expected for deposits dated in the window's first week.

The URL carries this login's R365 user id. If the report renders its parameter panel with no rows, get a fresh URL by drilling into any Balance Sheet figure (it opens GL Account Detail in a new tab) and swap in `Account=05DF50FB-4CE1-41B1-BCD5-3C9811B9AF95` in **uppercase**, since a lowercase id renders nothing.

Check the estimate period's sales days before posting. Daily Sales Summaries do not show on the All Transactions grid in Flecha, and the Monday closing the period is often not in yet on Tuesday; a day missing now only shifts the estimate, since the true-up uses the full sales.

## Step 2: true up and estimate

```bash
bash <skill>/scripts/run-week.sh flgh gl.txt <today> ids.txt <last week's entry dates> <this week's entry dates>
```

Seed `ids.txt` from the **Latest entries** table below, one `<entry date>|<location>|<id>` row per store. For an entry date already in `ids.txt`, `run-week.sh` refills that entry in place with `fill-entry.sh`, which unapproves it, sets the actual and its comment, saves, reloads, reads back and approves again, keeping the entry's id and date. For a new entry date it duplicates the store's latest id with `post-entry.sh`, fills the estimate the same way, and appends the new id. It prints one line per store: `TRUEUP`, `estimate` or `actual` with `OK <id> <fee>`, or `SKIP` with the reason (a flag from `build.js`, or a deposit not yet in, in which case the entry keeps its estimate until next run).

`fill-entry.sh` and `post-entry.sh` posted every entry from 9/6 to 10/4/2026, and the unapprove-and-refill path ran on the 9/30 HB entry. `run-week.sh` itself was written for the 10/11/2026 run and has not run yet; on its first run, read the entries back on All Transactions before trusting it.

The copy is on the server the moment Duplicate is clicked and prints as `copy <id>`. A `FAIL` after that line leaves an unapproved copy: finish it with `fill-entry.sh flgh <copy id> <date> <fee> "<comment>"` rather than duplicating again, and add it to `ids.txt`.

Compare each actual with its estimate. Fees ran 17% to 34% of sales in September 2026 (HB about 26.5%, Town Square about 34%, 4S Ranch alternating 12.00 and 7.87 on one recurring 44.60/44.61 order); an actual far outside its store's run usually means a missing sales day or a deposit covering two periods.

## Latest entries

`.scratch/flecha-grubhub/ids.txt` is the running `ids.txt` from 10/13/2026 on: `run-week.sh` appends each new entry to it, the next run trues those up and duplicates from them. The table below seeded it and is not updated; read the file for current ids.

| Location | 10/4/2026 TransactionId (estimate) |
|---|---|
| `103 - Flecha 4S Ranch` | `020ad52f-f171-4a9e-8590-ffe860e0d00a` |
| `101 - Flecha HB` | `5efd80e0-0ef7-48f7-ae46-3bd188e0db30` |
| `104 - Flecha NB` | `eb67c520-08b2-443f-aeec-1e3adf21e1f7` |
| `102 - Flecha Town Square` | `09a0f949-1492-44fe-ab2b-a140f73bf8b5` |

## The 3rd Party entries

A separate weekly Journal Entry numbered `3rd Party`, location Corporate, books the other delivery receivables to 7161. From 8/30/2026 on it carries no 1242 lines; the client removed them on 10/6/2026 so Grubhub fees post only through this skill. A `3rd Party` entry with a nonzero 1242 line books that store's Grubhub fee twice: report it and leave it for the human. `build.js` leaves those rows out of sales and deposits either way.

## Verifying the run

Rerun `gl-1242.sh`: each trued-up period's sales less its deposit less its `GrubHub` credit is 0.00 per store, and 1242's balance equals the estimated periods' sales less their estimates. All Transactions, Number contains `grub` (set through the grid's data source and give it about 15 seconds), shows four `GrubHub` rows per entry date, each Approved at its store with the fee as its Amount and the basis as its comment.

Report a table per store: last week's estimate, its actual and the change, then this week's sales, rate and estimate. Close the session by name: `playwright-cli -s=flgh close`. Never use `kill-all` or `close-all`.

## Unattended run

`scripts/tuesday-run.ps1` runs from Task Scheduler on Tuesdays at 16:00 from 10/13/2026 (`scripts/register-task.ps1` sets it up). It starts this skill headless with a prompt beginning `Unattended run`, naming the period, the report end (the Monday), the entry dates to true up and to estimate, the ids file and the work directory, and writes `done.txt` after, so the period runs once. `-Force` reruns a period, and `-Date yyyy-MM-dd` stands in for today. The true-up dates are last period's entry dates that are in the ids file, so a month-end stub posted by hand as an actual is left alone.

No human answers during the run, so:

- Never ask. Use session `flgh`, and run every command as `cd <work directory> && ...`, since Bash resets its directory between calls and `playwright-cli` binds the session to it. Write `gl.txt` there, and pass the named ids file to `run-week.sh` as is.
- Run Steps 1 and 2 with the named dates: `run-week.sh flgh gl.txt <report end> <ids file> <true-up dates> <estimate dates>`.
- A rejected login or an unreadable GL report fails the run: status `failed`, the reason in `note`, nothing posted.
- Every `SKIP` and `FAIL` line goes in `warnings` with the store and reason. A copy left by a `FAIL` after `copy <id>` is named there by its id; leave it.
- These go in `questions` and are left for the human: an actual outside 17% to 34% of sales, a `3rd Party` entry with a nonzero 1242 line, a `CHECK DEPOSIT MATCH`, and the period's Monday missing from the GL.

Finish with **Verifying the run**, close `flgh`, then write `result.json` in the work directory. The wrapper posts it to the Flecha TPD channel through `scripts/notify-teams.ps1`, and reports a failure when the file is missing:

```json
{ "period": "10/6-10/12", "status": "completed", "estimateTotal": 53.45, "trueUpTotal": 51.20,
  "stores": [ { "store": "Flecha HB", "priorEstimate": 24.41, "actual": 22.90, "sales": 91.97, "rate": 26.55, "estimate": 24.42 } ],
  "warnings": [], "questions": [], "note": "" }
```

`status` is `completed` when every estimate and true-up posted Approved, `partial` when some did, `failed` when none did. `priorEstimate` and `actual` are `null` for a store with nothing trued up, and `trueUpTotal` is `null` when no dates were trued up. The webhook lives in `~/.claude/flecha-grubhub.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "<name>", "email": "<work email>"}, "mentionWhen": "attention"}`. With `attention` the card tags Layla Ebersole only on a failure, a warning or a question; a clean period posts a Completed card untagged.

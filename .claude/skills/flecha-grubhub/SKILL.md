---
name: flecha-grubhub
description: Post the weekly Grubhub fee journal entries into Flecha Restaurant365, one per store, from 1242 - AR - GrubHub to 7161 - Delivery Fees, truing up last week's estimate to the Grubhub deposit received and estimating the week just ended from each store's historical fee rate, read from the GL Account Detail report, after moving any Grubhub deposit coded to Corporate onto its store. Use when asked to post, balance, or approve the Flecha GrubHub entries in R365, or to check a Flecha store's Grubhub sales against its deposits.
---

# Flecha Grubhub fees, weekly by store

Each run first moves any Grubhub deposit coded to Corporate onto its store, then does two things, one Journal Entry per store, four per entry date:

1. **True up** last week's entries: reset each to the store's sales for that period less the Grubhub deposit that settled it.
2. **Estimate** this week's entries: the week's sales × the store's fee rate over its last 4 settled periods with sales (total fees ÷ total sales). A store with no history uses the all-store rate.

There is no Grubhub portal for Flecha; both figures come from the 1242 GL. Every entry is numbered `GrubHub`, both lines at the store:

```
credit  1242 - AR - GrubHub     fee
debit   7161 - Delivery Fees    fee
```

Header and line comments carry the basis: `GrubHub fees estimate: sales 10/1-10/5 91.97 x 26.55% (2 period avg)` or `GrubHub fees: sales 9/1-9/7 208.70 less 9/11 deposit 153.32`. A store with no Grubhub sales gets its entry at 0.00, Approved.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it, and use the session name `flgh`:

```bash
bash .claude/skills/flecha-weekly-mgmt-fees/scripts/r365-login.sh flgh
```

Flecha shares the NORMS R365 login (`tlaroche`), read from `~/.claude/norms-credentials.md`. Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting anything new here.

## The period

Grubhub runs **Tuesday to Monday**. The entry is dated the **Sunday** inside the period (the 10/25/2026 entry is sales 10/20 to 10/26), and the deposit lands the **Friday after** the period ends.

A period that crosses month end splits: the part through the last day of the month gets its own entry dated that day, the rest the Sunday entry. Both parts settle on the same Friday; `build.js` gives each deposit to the latest open period before it and flags `CHECK DEPOSIT MATCH` when two could own it.

## Step 1: GL detail

```bash
bash <skill>/scripts/gl-1242.sh flgh <eight weeks back> <today> > gl.txt
```

It opens GL Account Detail for 1242 across all Flecha entities with Show Unapproved Yes and prints the rows. Eight weeks gives every store 4 settled periods for its rate; deposits in the window's first week print as `deposits matched to no period`, which is expected.

If the report renders its parameter panel with no rows, get a fresh URL by drilling into any Balance Sheet figure and swap in `Account=05DF50FB-4CE1-41B1-BCD5-3C9811B9AF95` in **uppercase**.

## Step 2: move Corporate deposits to their stores

Grubhub pays every store into the Corporate bank account (1032 - Corporate - 1319), one deposit per store, and the bank rule codes each deposit's 1242 line to Corporate. The true-up only sees a deposit at its store, so place them first:

```bash
node <skill>/scripts/assign.js gl.txt
```

It prints one row per Grubhub deposit from 9/1/2026 on whose 1242 line is not at a store: `<BD>|<date>|<amount>|<location>`, or `AMBIGUOUS` with the candidate stores and their sales. The memo carries no store, so the match is by amount: a deposit pays one store's Tue-Mon week that ended 4 to 10 days before it, at a fee of 10% to 45% of that week's sales, and deposits on one day go to different stores. When two placements fit, the one nearer each store's past fee rate wins by 10 points or more. No rows means every deposit is already at its store: skip to Step 3. `--all` reruns the match over deposits already placed, to test it against how they were coded.

For each matched row:

```bash
bash <skill>/scripts/set-location.sh flgh <BD> "<location>"
```

It finds the deposit in All Transactions, sets the 1242 line's Location through Adjustments, Edit, Edit Complete and Save and Close, and checks the server copy (`OK <BD> <location>`). The deposit stays Approved. Leave an `AMBIGUOUS` deposit at Corporate; its store's true-up then reports `NO DEPOSIT`. After any move, rerun Step 1 so Step 3 reads the new coding.

## Step 3: true up and estimate

```bash
bash <skill>/scripts/run-week.sh flgh gl.txt <report end> .scratch/flecha-grubhub/ids.txt <last week's entry dates> <this week's entry dates>
```

`ids.txt` holds one `<entry date>|<location>|<id>` row per posted entry. For an entry date already there, `run-week.sh` refills the entry in place (`fill-entry.sh` unapproves, sets the actual and comment, saves, reads back, approves). For a new entry date it duplicates the store's latest id with `post-entry.sh`, fills the estimate, and appends the new id.

It prints one line per store: `TRUEUP`, `estimate` or `actual` with `OK <id> <fee>`, or `SKIP` with the reason. A deposit not yet in, or one Step 2 left at Corporate, leaves that entry at its estimate (`NO DEPOSIT`). A `FAIL` after a `copy <id>` line leaves an unapproved copy: finish it with `fill-entry.sh flgh <copy id> <date> <fee> "<comment>"` and add it to `ids.txt`.

Compare each actual with its estimate. Fees run 17% to 34% of sales (HB about 26.5%, Town Square about 34%); an actual far outside its store's run usually means a missing sales day or a deposit covering two periods. Check the estimate period's sales days too: the Monday closing the period is often not in the GL yet on Tuesday, which only shifts the estimate, since the true-up uses the full sales.

## Step 4: recheck

Rerun `gl-1242.sh` into `gl-after.txt`: each trued-up period's sales less its deposit less its `GrubHub` credit is 0.00 per store, and 1242's balance equals the estimated periods' sales less their estimates. All Transactions, Number contains `grub` (set through the grid's data source and give it about 15 seconds), shows four `GrubHub` rows per entry date, each Approved at its store with the fee as its Amount and the basis as its comment.

Report a table per store: last week's estimate, its actual and the change, then this week's sales, rate and estimate. Close the session by name: `playwright-cli -s=flgh close`.

## Unattended run

`scripts/tuesday-run.ps1` runs from Task Scheduler on Tuesdays at 16:00 (`scripts/register-task.ps1` sets it up). Its prompt begins `Unattended run` and names the period, the report end (the Monday), the entry dates to true up and to estimate, the ids file and the work directory; it writes `done.txt` after, so a period runs once. `-Force` reruns a period, `-Date yyyy-MM-dd` stands in for today.

No human answers during the run, so:

- Use session `flgh` and run every command as `cd <work directory> && ...`. Write `gl.txt` there and pass the named ids file to `run-week.sh` as is.
- Run Steps 1 to 4 with the named dates. Each deposit Step 2 moved goes in `note` as `<BD> <amount> moved to <store>`.
- A rejected login or an unreadable GL report fails the run: status `failed`, the reason in `note`, nothing posted.
- Every `SKIP` and `FAIL` line, `set-location.sh` included, goes in `warnings` with the store and reason; a deposit left at Corporate is named by its BD number and amount.
- These go in `questions` and are left for the human: an `AMBIGUOUS` deposit with its candidate stores, an actual outside 17% to 34% of sales, a `3rd Party` entry with a nonzero 1242 line (it books that store's Grubhub fee twice), a `CHECK DEPOSIT MATCH`, the period's Monday missing from the GL, and a recheck that does not tie.

Close `flgh`, then write `result.json` in the work directory. The wrapper posts it to the Flecha TPD channel through `scripts/notify-teams.ps1`:

```json
{ "period": "10/6-10/12", "status": "completed", "estimateTotal": 53.45, "trueUpTotal": 51.20,
  "stores": [ { "store": "Flecha HB", "priorEstimate": 24.41, "actual": 22.90, "sales": 91.97, "rate": 26.55, "estimate": 24.42 } ],
  "warnings": [], "questions": [], "note": "" }
```

`status` is `completed` when every estimate and true-up posted Approved, `partial` when some did, `failed` when none did. `priorEstimate` and `actual` are `null` for a store not trued up. The webhook lives in `~/.claude/flecha-grubhub.json`; the card tags Layla Ebersole only on a failure, a warning or a question.

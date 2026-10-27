---
name: flecha-ezcater
description: Post the weekly EZ Cater fee journal entries into Flecha Restaurant365, one per store, from 1237 - AR - EZ Cater to 7161 - Delivery Fees, truing up last week's estimate to its sales less the Payoneer deposit and estimating the week just ended from each store's historical fee rate, read from the GL Account Detail report. Use when asked to post, balance, or approve the Flecha EZ Cater entries in R365, or to check a Flecha store's EZ Cater sales against its deposits.
---

# Flecha EZ Cater fees, weekly by store

This skill runs like [`../flecha-ubereats`](../flecha-ubereats/SKILL.md) on account 1237 and number `EZ Cater Fees`. There is no EZ Cater portal access for Flecha, so the fee is the **gap in the GL**: a store's EZ Cater sales for one Monday to Sunday week, less the Payoneer deposit on 1237 that lands the following Tuesday (comment `ORIG CO NAME:PAYONEER 7362`). Each week is posted twice:

- **Estimate**, in the run right after the Sunday: sales × the store's rate over its last 4 weeks with a deposit, total fees ÷ total sales; 30% with fewer (`DEFAULT_RATE=0.28` overrides it).
- **True-up**, in the next week's run, once the deposit has landed: the same entry reset to sales less deposit, so the store's 1237 holds only the sales after that Sunday.

Each week carries one Journal Entry per store, numbered `EZ Cater Fees`, dated the **Sunday**, header and lines at the store:

```
debit   7161 - Delivery Fees      fee
credit  1237 - AR - EZ Cater      fee
```

Header and both line comments name the basis: `EZ Cater fees estimate: sales 10/19-10/25 1330.71 x 39.86% (4 wk avg)`, or an actual `EZ Cater fees: sales 10/12-10/18 3022.37 less 10/20 deposit 1862.13`. A negative fee flips the sides.

## Start date and older entries

The first week is **10/25/2026**. Weeks through 10/18 belong to the human: Corporate `3rd Party` estimates at 30% plus store `EZ Cater Fees` true-ups, and the two 10/4 `3rd Party Spread` entries. Leave every entry dated 10/18 or earlier as it stands unless the user says otherwise; `run-weeks.sh` skips those weeks. Report an older week that does not tie, with its gap, as a question.

4S Ranch and HB show the target: on 10/11 and 10/18 their fee entries total sales less deposit to the penny and 1237 sits at 0.00 after each Tuesday deposit.

## What 1237 holds

- EZ Cater books 1 to 5 DSS days a week per store (catering days), so judge `days` against the store's own run of weeks.
- Fees ran 37% to 41% of sales at HB, 4S and NB and 47% to 51% at Town Square across September and October 2026. 4S 10/11 at 22.7% is the one outlier.
- `carry` on a row is what 1237 held at the Monday beyond the prior week's sales awaiting deposit. It is 0.00 when the earlier weeks tie. At 10/25 Town Square carries 1,592.53 (10/18 under-booked) and NB 2,630.70 (an old balance), both pending the user's own fixes. The true-up books sales less deposit only and never absorbs a carry.
- A deposit week fully past with no deposit keeps the estimate as basis `no deposit`.

## Steps

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/flecha-doordash/scripts/r365-login.sh fez
BYLOC=1 bash <skill>/scripts/gl.sh fez 1237 <Monday 12 weeks back> <today> > gl1237.txt
node <skill>/scripts/build-lines.js gl1237.txt <prior Sunday> <Sunday> > lines.json
bash <skill>/scripts/run-weeks.sh fez lines.json sources.txt ids.txt
```

`gl.sh` reads GL Account Detail by URL with Show Unapproved on, so an unapproved DSS still counts. `build-lines.js` writes one row per store per week with `basis`, `sales`, `days`, `fee`, `carry`, `booked` (fee entries already dated that Sunday) and `comment`, plus `deposit` and `deposits` on an actual or `rate` on an estimate.

`run-weeks.sh` behaves as in `flecha-ubereats`: a store-week in `ids.txt` is checked and, when it differs, unapproved, refilled in place and approved again; a new one duplicates the store's latest entry and is approved. A `FAIL` after the id line leaves a saved, unapproved copy: finish it with `REDO=<id> post-entry.sh fez lines.json <Sunday> "<location>" x`, then `bash <skills>/flecha-doordash/scripts/approve.sh fez <id>`.

## Latest entries

Update after every run with the Sunday just estimated. Until the first run, `sources.txt` seeds from the human's entries; NB has none, so it duplicates HB's.

| Location | TransactionId |
|---|---|
| `103 - Flecha 4S Ranch` | `2ab87751-f7e0-4fd9-a7a5-c05d0b495e69` (10/18, human) |
| `101 - Flecha HB` | `6a6d9049-30dc-480a-814e-b30a1b3a23bc` (10/18, human) |
| `104 - Flecha NB` | `6a6d9049-30dc-480a-814e-b30a1b3a23bc` (HB's) |
| `102 - Flecha Town Square` | `02825a65-3344-46ce-9223-8499d2ea7a8c` (10/11, human) |

## Unattended run

`scripts/tuesday-run.ps1` runs from Task Scheduler on Tuesdays at 16:30 from 10/27/2026 (`scripts/register-task.ps1` sets it up). It starts this skill headless with a prompt beginning `Unattended run`, naming the prior Sunday to true up (none on the first run), the Sunday to estimate, the work directory `.scratch/flecha-ezcater/wk<MMdd>`, and the prior week's `ids.txt`. It writes `done.txt` after, so the week runs once. `-Force` reruns a week, and `-Date yyyy-MM-dd` stands in for today.

No human answers during the run, so:

- Never ask, and leave this file alone. Use session `fez`, and run every command as `cd <work directory> && ...`, since Bash resets its directory between calls and `playwright-cli` binds the session to it.
- Seed `ids.txt` and `sources.txt` from the prior week's `ids.txt` when it exists, else `sources.txt` from **Latest entries**. This run's `ids.txt` must end holding every store-week posted, since the next run seeds from it.
- On the first run, pass `10/18/2026 10/25/2026` to `build-lines.js`: the 10/18 rows are read only, to report each store's `booked` against its actual `fee`.
- A rejected login, an unreadable report, or a `build-lines.js` STOP posts nothing: status `failed`, with the reason in `note`.
- A `FAIL` from `run-weeks.sh` is `failed`, with the store, week and any id left unapproved in `warnings`. Leave it.
- Post the week, and add a warning, for a fee outside 30% to 55% of sales, a `no deposit` week, or a nonzero `carry`.
- An older week that does not tie goes in `questions`, which tags. Known open items go in `notes`, which post untagged.

Finish with **Verifying the run**, close `fez`, then write `result.json` in the work directory. The wrapper posts it to the Flecha TPD channel through `scripts/notify-teams.ps1` (`-DryRun` prints the card), and reports a failure when the file is missing:

```json
{ "weekEnding": "11/1/2026", "priorWeekEnding": "10/25/2026", "status": "done",
  "stores": [ { "store": "Flecha HB", "priorEstimate": 530.42, "priorActual": 540.10, "sales": 1012.40, "days": 2, "rate": 0.3986, "estimate": 403.54, "basis": "estimate" } ],
  "warnings": [], "questions": [], "notes": [], "note": "" }
```

`status` is `done` (every store-week approved and verified) or `failed`. `priorWeekEnding`, `priorEstimate` and `priorActual` are `null` on the first run. The webhook lives in `~/.claude/flecha-ezcater.json`, outside the repo, shaped like `flecha-ubereats`'s; the card tags Layla only when the run failed or carries a warning or question.

## Verifying the run

Rerun `gl.sh` and `build-lines.js`: a trued-up week's `booked` equals its `fee`, an estimated week's `booked` equals its estimate, and `carry` on the new Sunday is 0.00 for every store whose earlier weeks tie. All Transactions, Number contains `EZ Cater`, shows one `EZ Cater Fees` row per store per Sunday from 10/25, Approved, with `fee` as its Amount.

Report a table per store: the prior Sunday's estimate, its actual and the change, then the new Sunday's sales, days, rate and estimate, with every `carry` and `no deposit` called out. Close the session by name: `playwright-cli -s=fez close`. Other skills run their own sessions on this machine, so never use `kill-all` or `close-all`.

---
name: flecha-ubereats
description: Post the weekly Uber Eats fee journal entries into Flecha Restaurant365, one per store, from 1235 - A/R - 3rd Party Delivery to 7161 - Delivery Fees, estimating the week just ended from each store's historical fee rate and truing up the prior week's estimate to its sales less the Uber deposit, read from the GL Account Detail report. Use when asked to post, balance, or approve the Flecha Uber Eats entries in R365, or to check a Flecha store's Uber Eats sales against its deposits.
---

# Flecha Uber Eats fees, weekly by store

This skill follows [`../flecha-doordash`](../flecha-doordash/SKILL.md) step for step, on account 1235 and number `Uber Eats`; read that skill for the run's shape. There is no Uber portal access for Flecha, so the fee is the **gap in the GL**: a store's Uber Eats sales for one Monday to Sunday week, less the deposits on 1235 that land the following Monday to Sunday (Uber pays on the Tuesday, now and then the Wednesday). Each week is posted twice:

- **Estimate**, in the run right after the Sunday: sales × the store's fee rate over its last 4 actual weeks, total fees ÷ total sales. A store with fewer than 4 actual weeks in the last 12 gets 30%, the old 3rd Party basis (`DEFAULT_RATE=0.28` overrides it).
- **True-up**, in the next week's run, once the deposit has landed: the same entry reset to sales less deposit.

Each week carries one Journal Entry per store, numbered `Uber Eats`, dated the **Sunday**, header and lines at the store:

```
debit   7161 - Delivery Fees                     fee
credit  1235 - A/R - 3rd Party Delivery          fee
```

Header and both line comments name the basis: `Uber Eats fees estimate: sales 10/5-10/11 649.06 x 51.20% (4 wk avg)`, or `(default)` on the 30% fallback; an actual reads `Uber Eats fees: sales 10/5-10/11 649.06 less 10/14 deposit 312.40`. A negative fee flips the sides.

## Start date

The first week is **8/30/2026**. Weeks 8/30 to 10/4 were posted at actual on 10/13/2026 and their 1235 lines taken out of the Corporate `3rd Party` entries; the 8/24 `3rd Party Cleanup` clears what 1235 held before that. `flecha-3rd-party`'s `estimate.js` leaves 1235 out from 8/30, so a `3rd Party` entry dated 8/30 or later with a 1235 line books the Uber fee twice: report it and leave it for the human.

With no prior Uber Eats entry, seed `sources.txt` from `flecha-doordash`'s **Latest entries** table; `post-entry.sh` moves a DoorDash source's 1239 line to 1235.

## What 1235 holds

1235 is the store's Uber Eats receivable, and these patterns from July to October 2026 shape the numbers:

- **4S Ranch** also carries near-daily `SC FC4SR` deposits on 1235 beside its `UBER USA 6787` deposits. `build-lines.js` counts every bank deposit on 1235 as the store's deposit, so the true-up clears the account; report the SC share each week until the user rules on what SC FC4SR is.
- **NB** has no deposits on 1235 at all since its Uber sales began in August 2026. Its weeks never reach an actual: they stay estimates at the default rate with basis `no deposit`, and its balance grows by sales less fee.
- **HB** misses a deposit some weeks (9/20, and every week before 8/30). A covered deposit week with no deposit keeps the estimate as basis `no deposit` rather than booking 100% of sales.
- Town Square is clean: one `Uber USA, LLC` deposit a week, fees 46% to 56% of sales across September 2026.

Uber fees run high against sales here (46% to 62% at TS and 4S over September), so judge a fee against the store's own run of weeks.

## Steps

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/flecha-doordash/scripts/r365-login.sh fue
bash <skill>/scripts/gl-detail.sh fue <Monday 12 weeks back> <today> gl1235.csv
node <skill>/scripts/build-lines.js gl1235.csv <prior Sunday> <Sunday> > lines.json
bash <skill>/scripts/run-weeks.sh fue lines.json sources.txt ids.txt
```

Pass both Sundays, the prior one first. `build-lines.js` writes one row per store per week with `basis`, `sales`, `days`, `fee` and `comment`, plus `deposit` and `deposits` on an actual or `rate` on an estimate; a store-week with no sales and no deposit gets no row. Check `days` before posting an estimate: Uber runs 5 to 7 DSS days a week, so a short week usually means a missing DSS.

`run-weeks.sh` behaves as in `flecha-doordash`: a store-week in `ids.txt` is checked and, when it differs, unapproved, refilled in place and approved again; a new one duplicates the store's latest entry and is approved. The approve, unapprove and duplicate scripts are `flecha-doordash`'s. A `FAIL` after the id line leaves a saved, unapproved copy: finish it with `REDO=<id> post-entry.sh fue lines.json <Sunday> "<location>" x`, then `approve.sh`.

## Latest entries

Update this table at the end of every run with the Sunday just estimated. The next run trues these up and duplicates from them.

| Location | 10/11/2026 TransactionId (estimate) |
|---|---|
| `103 - Flecha 4S Ranch` | `3910f458-7e23-4245-9796-fd83f093b51f` |
| `101 - Flecha HB` | `47bdcf06-75ae-4ccc-aad6-73c879314216` |
| `104 - Flecha NB` | `afec4c5e-9dc4-4a56-8b72-b51480f9f28d` |
| `102 - Flecha Town Square` | `5c88b733-50dc-4b7a-816c-67739b91e4e1` |

## Unattended run

`scripts/tuesday-run.ps1` runs from Task Scheduler on Tuesdays at 16:00 from 10/13/2026 (`scripts/register-task.ps1` sets it up). It starts this skill headless with a prompt beginning `Unattended run`, naming the prior Sunday to true up (none on the first run), the Sunday to estimate, the work directory `.scratch/flecha-ubereats/wk<MMdd>`, and the prior week's `ids.txt`. It writes `done.txt` after, so the week runs once. `-Force` reruns a week, and `-Date yyyy-MM-dd` stands in for today.

No human answers during the run, so:

- Never ask, and leave this file alone. Use session `fue`, and run every command as `cd <work directory> && ...`, since Bash resets its directory between calls and `playwright-cli` binds the session to it.
- Seed `ids.txt` and `sources.txt` from the prior week's `ids.txt` when it exists, else as **Start date** says for the first run. This run's `ids.txt` must end holding every store-week posted in both Sundays, since the next run seeds from it.
- A rejected login, an unreadable report, or a `build-lines.js` STOP posts nothing: status `failed`, with the reason in `note`.
- A `FAIL` from `run-weeks.sh` is `failed`, with the store, week and any id left unapproved in `warnings`. Leave it.
- Post the week, and add a warning, for a store under 5 DSS days, a fee outside 35% to 70% of sales, an HB or Town Square week with no deposit, or a `3rd Party` entry from 8/30 on carrying 1235.
- The known open items go in `notes`, which post untagged: 4S's SC FC4SR deposit amount and NB's `no deposit` week. Anything else that needs a ruling goes in `questions`, which tags.

Finish with **Verifying the run**, close `fue`, then write `result.json` in the work directory. The wrapper posts it to the Flecha TPD channel through `scripts/notify-teams.ps1` (`-DryRun` prints the card), and reports a failure when the file is missing:

```json
{ "weekEnding": "10/18/2026", "priorWeekEnding": "10/11/2026", "status": "done",
  "stores": [ { "store": "Flecha HB", "priorEstimate": 340.75, "priorActual": 352.10, "sales": 1012.40, "days": 6, "rate": 0.4988, "estimate": 504.98, "basis": "estimate" } ],
  "warnings": [], "questions": [], "notes": ["4S SC FC4SR deposits 10/12-10/18: 210.44"], "note": "" }
```

`status` is `done` (every store-week approved and verified) or `failed`. `priorWeekEnding`, `priorEstimate` and `priorActual` are `null` on the first run. The webhook lives in `~/.claude/flecha-ubereats.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "Layla Ebersole", "email": "layla@ocra-us.com"}, "mentionWhen": "attention"}`. With `attention` the card tags Layla only when the run failed or carries a warning or question; a clean week posts a Completed card untagged.

## Verifying the run

Rerun `gl-detail.sh` and read 1235 by store: a trued-up week's sales less its deposits less its `Uber Eats` credit is 0.00, and an estimated week's credit equals its estimate. All Transactions, Number contains `uber`, shows one `Uber Eats` row per store per Sunday, Approved, with `fee` as its Amount.

Report a table per store: the prior Sunday's estimate, its actual and the change, then the new Sunday's sales, rate and estimate, with every `no deposit` week and 4S's SC FC4SR amount called out, then any `3rd Party` entry from 8/30 on still carrying 1235. Close the session by name: `playwright-cli -s=fue close`. Other skills run their own sessions on this machine, so never use `kill-all` or `close-all`.

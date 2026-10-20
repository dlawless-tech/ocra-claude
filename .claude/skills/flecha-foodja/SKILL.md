---
name: flecha-foodja
description: Post the weekly Foodja fee journal entries into Flecha Restaurant365, one per store, from 1238 - AR - Foodja to 7161 - Delivery Fees, at the week's sales times the fee rate read from recent Foodja statements. Use when asked to post, balance, or approve the Flecha Foodja entries in R365, to pull Flecha Foodja statements, or to check a Flecha store's Foodja fee rate.
---

# Flecha Foodja fees, weekly by store

Each run posts the week that ended Sunday: per store, the week's Foodja sales × the fee rate. A posted week stays as posted; the user ruled on 10/20/2026 that prior weeks are never corrected, so a later statement only feeds the rate for weeks to come.

The rate is the chain's over every store-week with a posted statement in the 12 weeks before the Sunday, (sales − Amount Due) ÷ sales. Fewer than 4 such store-weeks falls back to 45.15% (`DEFAULT_RATE` overrides it).

Each week carries one Journal Entry per store with Foodja sales, numbered `Foodja`, dated the **Sunday**, header and lines at the store:

```
debit   7161 - Delivery Fees      fee
credit  1238 - AR - Foodja        fee
```

Header and line comments read `Foodja fees estimate: sales 10/12-10/18 1724.00 x 44.72% (12 wk avg)`, or `(default)` on the fallback.

## Start date

The first week is **10/4/2026**. Foodja (1238) was in the Corporate `3rd Party` entry until then; on 10/20/2026 its lines were taken out of the 10/4 and 10/11 entries and these per-store entries posted for 10/4, 10/11 and 10/18. `flecha-3rd-party`'s `estimate.js` leaves 1238 out from 10/4, so a `3rd Party` entry dated 10/4 or later with a 1238 line books the Foodja fee twice: report it and leave it for the human.

## Foodja and 1238

- **Statements.** One PDF per two-week period for all stores, billing code 12773, Monday to Sunday (9/28 to 10/11/2026, 10/12 to 10/25, and on), posted about 11 days after the period closes. Foodja pays each store's Amount Due on the check date, the Friday after, as a deposit on 1238 at that store.
- **The fee.** Foodja keeps a flat 40.90% of Restaurant Total at every store since 7/20/2026 (46.90% before). The DSS books Restaurant Total plus 7.75% tax to 1238, and Foodja pays none of the tax, so on R365's sales the rate runs 45.15%. A DSS day landing in a different week than Foodja's delivery date moves the 12-week rate a little (44.72% on 10/20/2026).
- **Stores.** `Flecha Cantina - HB`, `- 4s Ranch`, `- Newport Beach` map to HB, 4S Ranch, NB. Town Square has no Foodja. `build-lines.js` stops on a statement store it does not know.

## Steps

Logins: Foodja from `~/.claude/flecha-credentials.md`, R365 from `norms-credentials.md`. Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
CREDS=$HOME/.claude/flecha-credentials.md bash <skills>/norms-foodja-fees/scripts/fj-login.sh ffj
bash <skills>/flecha-doordash/scripts/r365-login.sh ffjr
for d in <each period end in the 12 weeks>; do bash <skills>/norms-foodja-fees/scripts/statements.sh ffj $d dl; done; mkdir -p statements; cp dl/statements/*.pdf statements/
node <skill>/scripts/parse-statements.js statements > statements.json
bash <skills>/flecha-3rd-party/scripts/gl.sh ffjr 1238 <Monday 13 weeks before the Sunday> <Sunday> > gl1238.txt
node <skill>/scripts/build-lines.js gl1238.txt statements.json <Sunday> > lines.json
bash <skill>/scripts/run-weeks.sh ffjr lines.json sources.txt ids.txt
```

`statements.sh` is NORMS's downloader; its own parse step prints `FAIL: no total line` on Flecha's layout after the PDF lands, which is expected, so parse with this skill's `parse-statements.js`. That parser checks every store's orders against its subtotal and the stores against the statement total, within 5 cents, since Foodja rounds each order.

`build-lines.js` writes one row per store with `sales`, `days`, `rate`, `fee` and `comment`. Foodja runs 1 to 5 DSS days a week per store, so judge `days` against the store's own run.

`run-weeks.sh` posts each row not yet in `ids.txt` by duplicating the store's latest Foodja entry (`sources.txt`, `<location>|<TransactionId>`), reads it back to `MATCH`, approves it and appends it to `ids.txt`. A row already in `ids.txt` is left as posted. A `FAIL` after the id line leaves a saved, unapproved copy: finish it with `REDO=<id> post-entry.sh ffjr lines.json <Sunday> "<location>" x`, then `flecha-doordash/scripts/approve.sh`.

## Latest entries

Update this table at the end of every run with the Sunday just posted; the next run duplicates from it.

| Location | 10/18/2026 TransactionId |
|---|---|
| `101 - Flecha HB` | `0228ea16-6771-40f9-9ed9-7e724325e2ee` |
| `103 - Flecha 4S Ranch` | `0487130b-2539-4028-903d-1b4ace57d01a` |
| `104 - Flecha NB` | `e9c20a37-18c6-4e80-9696-8ff8f776c5fb` |

## Unattended run

`scripts/tuesday-run.ps1` runs from Task Scheduler on Tuesdays at 19:15 from 10/27/2026 (`scripts/register-task.ps1` sets it up). It starts this skill headless with a prompt beginning `Unattended run`, naming the Sunday, the work directory `.scratch/flecha-foodja/wk<MMdd>`, and the prior week's `ids.txt`. It writes `done.txt` after, so the week runs once. `-Force` reruns a week, and `-Date yyyy-MM-dd` stands in for today.

No human answers during the run, so:

- Never ask, and leave this file alone. Use sessions `ffj` (Foodja) and `ffjr` (R365), and run every command as `cd <work directory> && ...`, since Bash resets its directory between calls and `playwright-cli` binds the session to it.
- Seed `sources.txt` with each store's newest id in the prior week's `ids.txt`, else **Latest entries**. A store with no Foodja entry yet duplicates the store's newest `Uber Eats` entry; `post-entry.sh` moves its 1235 line to 1238.
- If All Transactions already shows a `Foodja` row for a store on the Sunday, post nothing for that store and put its id in `ids.txt` and `notes`.
- A rejected login, an unreadable report, or a parse or `build-lines.js` STOP posts nothing: status `failed`, with the reason in `note`.
- A `FAIL` from `run-weeks.sh` is `failed`, with the store and any id left unapproved in `warnings`. Leave it.
- Post the week, and add a warning, for a rate outside 40% to 50%, a `(default)` rate, no statement posted in the last 4 weeks, a store with no sales after 3 weeks running with sales, or a `3rd Party` entry from 10/4 on carrying 1238.

Finish with **Verifying the run**, close both sessions, then write `result.json` in the work directory. The wrapper posts it to the Flecha TPD channel through `scripts/notify-teams.ps1` (`-DryRun` prints the card), and reports a failure when the file is missing:

```json
{ "weekEnding": "10/25/2026", "status": "done",
  "stores": [ { "store": "Flecha HB", "sales": 1012.40, "days": 3, "rate": 0.4472, "fee": 452.74, "id": "<TransactionId>" } ],
  "warnings": [], "questions": [], "notes": [], "note": "" }
```

`status` is `done` (every store approved and read back) or `failed`. The webhook lives in `~/.claude/flecha-foodja.json`, outside the repo: `{"teamsWebhook": "<url>", "mentions": [{"name": "Tricia LaRoche", "email": "tricia@ocra-us.com"}, {"name": "Layla Ebersole", "email": "layla@ocra-us.com"}], "mentionWhen": "attention"}`. With `attention` the card tags both only when the run failed or carries a warning or question; a clean week posts a Completed card untagged.

## Verifying the run

All Transactions, Number contains `foodja`, shows one `Foodja` row per store with sales on the Sunday, Approved, with `fee` as its Amount. Report a table per store of sales, days, rate and fee, the entry ids, and any `3rd Party` entry from 10/4 on still carrying 1238. Close the sessions by name: `playwright-cli -s=ffj close`, `playwright-cli -s=ffjr close`. Other skills run their own sessions on this machine, so never use `kill-all` or `close-all`.

---
name: flecha-foodja
description: Post the weekly Foodja fee journal entries into Flecha Restaurant365, one per store, from 1238 - AR - Foodja to 7161 - Delivery Fees, at the week's actual fee, the store's 1238 sales less what Foodja pays for the week's orders, from Foodja's Order History and statements, and checking the prior 3 weeks for Layla without changing them. Use when asked to post, balance, or approve the Flecha Foodja entries in R365, to pull Flecha Foodja statements or orders, or to check a Flecha store's Foodja fees.
---

# Flecha Foodja fees, weekly by store

Each run logs in to Foodja and posts the week that ended Sunday at its actual fee: per store, the week's 1238 sales less what Foodja pays for the week's orders. The fee clears 1238 to the Foodja deposit. The same run rebuilds the 3 weeks before and checks them against what is posted, but never changes a posted week: a difference goes to Layla, who decides on the change (user, 10/26/2026).

What Foodja pays for a week comes from the statement's Amount Due once the statement covering it has posted. Until then it comes from Order History, each order's Restaurant Total × (1 − 40.90%) to the cent. That is how the statement prices each order, so the two agree unless Foodja adjusts an order. `FEE_RATE` overrides the 40.90%.

Each week carries one Journal Entry per store with Foodja sales, numbered `Foodja`, dated the **Sunday**, header and lines at the store:

```
debit   7161 - Delivery Fees      fee
credit  1238 - AR - Foodja        fee
```

Header and line comments read `Foodja fees: sales 10/12-10/18 1724.00 less Foodja pays 941.46 (3 orders, orders)`, ending `statement` once the statement backs it.

## Start date

The first week is **10/4/2026**. Foodja (1238) was in the Corporate `3rd Party` entry until then; on 10/20/2026 its lines were taken out of the 10/4 and 10/11 entries. The last `3rd Party` entry is 10/18/2026, and the 10/4 to 10/18 entries leave 1238 out; a `3rd Party` entry dated 10/4 or later with a 1238 line books the Foodja fee twice: report it and leave it for the human. The 10/4 to 10/18 entries were first posted at a 12-week rate estimate and corrected to actual on 10/26/2026, and all read back MATCH.

## Foodja and 1238

- **Statements.** One PDF per two-week period for all stores, billing code 12773, Monday to Sunday (9/28 to 10/11/2026, 10/12 to 10/25, and on), posted about 11 days after the period closes. Foodja pays each store's Amount Due on the check date, the Friday after, as a deposit on 1238 at that store.
- **Order History.** Lists every order by delivery date with its Restaurant Total ("Sales"), period and check date, the day after delivery. It matched the 9/28 to 10/11 statement order for order.
- **The fee.** Foodja keeps a flat 40.90% of Restaurant Total at every store since 7/20/2026 (46.90% before). The DSS books Restaurant Total plus 7.75% tax to 1238, and Foodja pays none of the tax, so the fee runs about 45.15% of R365 sales. Toast sometimes books an order at a different amount than Foodja (4S Ranch 10/13/2026: 607.00 against 600.00). The fee takes the difference, and `build-lines.js` warns on any week off by more than 5 cents.
- **Stores.** `Flecha Cantina - HB`, `- 4s Ranch`, `- Newport Beach` map to HB, 4S Ranch, NB. Town Square has no Foodja. `build-lines.js` stops on a store it does not know.

## Steps

Logins: Foodja from `~/.claude/flecha-credentials.md`, R365 from the same file's R365 block. Work in one directory for the whole run, since `playwright-cli` binds sessions to it. `<Monday>` is the Monday 3 weeks before the week's own Monday:

```bash
bash <skill>/scripts/fj-login.sh ffj
bash <skills>/flecha-doordash/scripts/r365-login.sh ffjr
for d in <each period end from <Monday> to 2 weeks past the Sunday>; do bash <skill>/scripts/statements.sh ffj $d dl; done; mkdir -p statements; cp dl/statements/*.pdf statements/ 2>/dev/null
node <skill>/scripts/parse-statements.js statements > statements.json
bash <skill>/scripts/orders.sh ffj <Monday> <Sunday> > orders.json
bash <skills>/flecha-ezcater/scripts/gl.sh ffjr 1238 <Monday> <Sunday> > gl1238.txt
node <skill>/scripts/build-lines.js gl1238.txt statements.json orders.json <Sunday> > lines.json
bash <skill>/scripts/run-weeks.sh ffjr lines.json sources.txt ids.txt
node <skill>/scripts/build-lines.js gl1238.txt statements.json orders.json <Sunday - 21> <Sunday - 14> <Sunday - 7> > check.json
bash <skill>/scripts/check-weeks.sh ffjr check.json ids.txt
```

`statements.sh` is NORMS's downloader; its own parse step prints `FAIL: no total line` on Flecha's layout after the PDF lands, and `none for <date>` for a period not posted yet. Both are expected. Parse with this skill's `parse-statements.js`, which checks every store's orders against its subtotal and the stores against the statement total, within 5 cents, since Foodja rounds each order. No PDFs at all is fine: every week falls back to Order History.

`orders.sh` fails when the search dates do not stick or it reads fewer rows than the table counts.

`build-lines.js` writes one row per store-week with `basis` (`statement` or `orders`), `sales`, `days`, `orders`, `rt`, `due`, `fee`, `rate` and `warn`. It warns when R365 sales are off Foodja's Restaurant Total plus tax by more than 5 cents, or a statement's Amount Due is off Order History. A store-week with sales and no Foodja orders, or orders and no sales, gets a `skip` reason and posts nothing.

`ids.txt` carries every posted Foodja entry, `<Sunday>|<location>|<id>`, from week to week. `run-weeks.sh` posts the Sunday's rows. A row not in `ids.txt` is posted by duplicating the store's latest Foodja entry (`sources.txt`, `<location>|<TransactionId>`), read back, approved and appended. A `FAIL` after the id line leaves a saved, unapproved entry: finish it with `REDO=<id> post-entry.sh ffjr lines.json <Sunday> "<location>" x`, then `flecha-doordash/scripts/approve.sh`.

`check-weeks.sh` reads each prior week's posted entry back against its rebuilt row and changes nothing. It prints `MATCH`, `DIFF` with the posted and actual fee, `MISSING` for a store-week with no entry, or `SKIP`. A `DIFF` usually means a statement adjusted an order or a DSS was edited after posting. To make a change Layla has approved, run `run-weeks.sh` on a lines file holding only that row: it unapproves, refills, reads back and approves the existing entry.

## Latest entries

Update this table at the end of every run with the Sunday just posted; the next run duplicates from it.

| Location | 10/18/2026 TransactionId |
|---|---|
| `101 - Flecha HB` | `0228ea16-6771-40f9-9ed9-7e724325e2ee` |
| `103 - Flecha 4S Ranch` | `0487130b-2539-4028-903d-1b4ace57d01a` |
| `104 - Flecha NB` | `e9c20a37-18c6-4e80-9696-8ff8f776c5fb` |

## Unattended run

`scripts/tuesday-run.ps1` runs from Task Scheduler on Tuesdays at 16:00 from 11/3/2026 (`scripts/register-task.ps1` sets it up). It starts this skill headless with a prompt beginning `Unattended run`, naming the Sunday, the work directory `.scratch/flecha-foodja/wk<MMdd>`, and the prior week's `ids.txt`. It writes `done.txt` after, so the week runs once. `-Force` reruns a week, and `-Date yyyy-MM-dd` stands in for today.

No human answers during the run, so:

- Never ask, and leave this file alone. Use sessions `ffj` (Foodja) and `ffjr` (R365), and run every command as `cd <work directory> && ...`, since Bash resets its directory between calls and `playwright-cli` binds the session to it.
- Copy the prior week's `ids.txt` into the work directory as this week's `ids.txt`. Seed `sources.txt` with each store's newest id in it, else **Latest entries**. A store with no Foodja entry yet duplicates the store's newest `Uber Eats` entry; `post-entry.sh` moves its 1235 line to 1238.
- Run `bash <skill>/scripts/find-entries.sh ffjr <Sunday M/D/YYYY>` for the Sunday and each prior week checked. Use only this skill's and `flecha-*` scripts, never another client's. If it shows a `Foodja` row for a store on a Sunday that `ids.txt` lacks, add it to `ids.txt` before `run-weeks.sh`, so the run corrects it instead of posting a second one, and say so in `notes`.
- A rejected login, an unreadable report, or an `orders.sh`, parse or `build-lines.js` failure posts nothing: status `failed`, with the reason in `note`.
- A `FAIL` from `run-weeks.sh` is `failed`, with the store and any id left unapproved in `warnings`. Leave it.
- Never change a prior week. Each `DIFF` or `MISSING` from `check-weeks.sh` goes in `questions` as a decision for Layla, with the week, store, entry id, posted fee, actual fee and why they differ.
- Post the week, and add a warning, for each `warn` and `skip` on the Sunday, a fee outside 40% to 50% of sales, a store with no sales after 3 weeks running with sales, or a `3rd Party` entry from 10/4 on carrying 1238.

Finish with **Verifying the run**, close both sessions, then write `result.json` in the work directory. The wrapper posts it to the Flecha TPD channel through `scripts/notify-teams.ps1` (`-DryRun` prints the card), and reports a failure when the file is missing:

```json
{ "weekEnding": "10/25/2026", "status": "done",
  "stores": [ { "store": "Flecha HB", "sales": 1012.40, "days": 3, "rate": 0.4515, "fee": 457.10, "id": "<TransactionId>" } ],
  "warnings": [], "questions": [], "notes": [], "note": "" }
```

`status` is `done` (every Sunday store approved and read back) or `failed`. The webhook lives in `~/.claude/flecha-foodja.json`, outside the repo: `{"teamsWebhook": "<url>", "mentions": [{"name": "Tricia LaRoche", "email": "tricia@ocra-us.com"}, {"name": "Layla Ebersole", "email": "layla@ocra-us.com"}], "mentionWhen": "attention"}`. With `attention` the card tags both only when the run failed or carries a warning or question; a clean week posts a Completed card untagged.

## Verifying the run

All Transactions, Number contains `foodja`, shows one `Foodja` row per store with sales on the Sunday, Approved, with `fee` as its Amount. Report a table per store of sales, Foodja pays, fee and basis for the Sunday, the `check-weeks.sh` result for the prior weeks, the entry ids, and any `3rd Party` entry from 10/4 on still carrying 1238. Close the sessions by name: `playwright-cli -s=ffj close`, `playwright-cli -s=ffjr close`. Other skills run their own sessions on this machine, so never use `kill-all` or `close-all`.

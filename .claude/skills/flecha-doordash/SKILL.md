---
name: flecha-doordash
description: Post the weekly DoorDash fee journal entries into Flecha Restaurant365, one per store, from 1239 - AR - DoorDash to 7161 - Delivery Fees, estimating the week just ended from each store's historical fee rate and truing up the prior week's estimate to its sales less the DoorDash deposit, read from the GL Account Detail report. Use when asked to post, balance, or approve the Flecha DoorDash entries in R365, or to check a Flecha store's DoorDash sales against its deposits.
---

# Flecha DoorDash fees, weekly by store

There is no DoorDash portal access for Flecha, so the fee is the **gap in the GL**: a store's DoorDash sales for one Monday to Sunday week, less the DoorDash deposit that lands the following Friday. That deposit arrives after the week is booked, so each week is posted twice:

- **Estimate**, in the run right after the Sunday: sales × the store's fee rate over its last 4 actual weeks, total fees ÷ total sales.
- **True-up**, in the next week's run, once the deposit has landed: the same entry reset to sales less deposit.

Each weekly run therefore trues up the prior Sunday and estimates the Sunday just ended. Each week carries one Journal Entry per store, four in all, numbered `DoorDash`, dated the **Sunday**, header and lines at the store:

```
debit   7161 - Delivery Fees      fee
credit  1239 - AR - DoorDash      fee
```

Header and both line comments name the basis: an estimate reads `DoorDash fees estimate: sales 9/28-10/4 630.16 x 34.33% (4 wk avg)`, an actual reads `DoorDash fees: sales 8/31-9/6 823.07 less 9/11 deposit 514.98`. A negative fee (deposit above sales) flips the sides; `post-entry.sh` handles it.

| Store | Location |
|---|---|
| Flecha 4S Ranch | `103 - Flecha 4S Ranch` |
| Flecha HB | `101 - Flecha HB` |
| Flecha NB | `104 - Flecha NB` |
| Flecha Town Square | `102 - Flecha Town Square` |

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skill>/scripts/r365-login.sh fdd
```

Flecha shares the NORMS R365 login (`tlaroche`), read from `~/.claude/norms-credentials.md`. Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting anything new here; the same R365 build serves Flecha.

## The week

Run early in the week after Sunday S, once S's Daily Sales Summaries are in: the run estimates S and trues up S minus 7, whose deposit landed the Friday before. Sales are the Daily Sales Summary journal entries (numbered `JE000xxxxx`) dated Monday to Sunday; the deposit is the store's DoorDash Bank Deposit (comment `ORIG CO NAME:DoorDash, Inc.`) dated the following Monday to Sunday. Week ending 9/6/2026 is sales 8/31 to 9/6 against the 9/11 deposit.

## Step 1: GL detail

```bash
bash <skill>/scripts/gl-detail.sh fdd <first Monday> <today> gl1239.csv
node <skill>/scripts/build-lines.js gl1239.csv <Sunday>... > lines.json
```

`gl-detail.sh` runs **GL Account Detail** (My Reports, Accounting tab) for `1239 - AR - DoorDash`, all locations, Subtotal By Location, Show Unapproved **Yes**, and saves the SSRS CSV export. Show Unapproved matters: a Daily Sales Summary still unapproved is a real day of sales. The scope handler does not set that button, so the script falls back to a real click and stops if the dialog does not read Yes.

Pass both Sundays, the prior one first. `build-lines.js` writes one row per store per week with `basis`, `sales`, `days` (DSS days found), `fee` and `comment`, plus `deposit` and `deposits` (BD numbers) on an actual or `rate` on an estimate. A week whose deposit week runs past the report end is an estimate; a deposit week the report fully covers with no deposit stops the run, since that store's actual cannot be computed. Pull the report from at least six weeks back so every store has 4 actual weeks for its rate.

Compare `days` with the store's usual week before posting an estimate: Town Square books DoorDash on about 4 days a week, the others 5 to 7. Check each fee against the store's run of weeks before posting: fees ran 30% to 40% of sales across September 2026, so a fee far outside that usually means a missing sales day or a deposit covering two weeks.

## Step 2: post and approve

```bash
bash <skill>/scripts/run-weeks.sh fdd lines.json sources.txt ids.txt
```

Seed both files from the **Latest entries** table below: `ids.txt` gets one `<Sunday>|<location>|<id>` per store for the prior Sunday, and `sources.txt` one `<location>|<id>` per store.

For a store-week already in `ids.txt` (the prior Sunday), `run-weeks.sh` reads the entry back with `check-entry.sh`. `MATCH` means it already holds the actual. Otherwise it unapproves with `unapprove.sh`, refills the same entry in place with `REDO=<id> post-entry.sh`, and approves it again, so the true-up keeps the entry's id and its Sunday date. For a new store-week (the Sunday just ended) it duplicates the store's latest entry with `post-entry.sh`, which sets date, number, header location, both lines and comments, saves, and checks; then `approve.sh` approves it and the id goes to `ids.txt`.

The true-up path (unapprove, refill, approve) was first written for the 10/4/2026 week and is not yet exercised; on its first run, read the trued-up entries back in All Transactions before trusting it.

Flecha numbers a fresh duplicate `JE000xxxxx` (FARE and NORMS use `NJ...`), and the copy is on the server the moment Duplicate is clicked. A `FAIL` after the id line leaves a saved, unapproved copy: finish it with `REDO=<id> post-entry.sh fdd lines.json <Sunday> "<location>" x`, then `approve.sh`, rather than duplicating again.

## Latest entries

Update this table at the end of every run with the Sunday just estimated. The next run trues these up and duplicates from them.

| Location | 10/4/2026 TransactionId (estimate) |
|---|---|
| `103 - Flecha 4S Ranch` | `b6e41a05-359d-4a25-8c4b-7d119fa9d2b2` |
| `101 - Flecha HB` | `cb822d33-265b-4f9c-8ddf-8dc207cd5cf3` |
| `104 - Flecha NB` | `d594a93d-5338-4514-9ce2-ca7c175155dc` |
| `102 - Flecha Town Square` | `c8c46676-5b53-4ce8-8536-522aa3aacf81` |

## The 3rd Party entries

A separate weekly Journal Entry numbered `3rd Party`, location Corporate, posted by [`../flecha-3rd-party`](../flecha-3rd-party/SKILL.md), clears the other delivery receivables (1235, 1237 EZ Cater, 1238 Foodja) to 7161. Through 8/23/2026 it also cleared 1239; from 8/30/2026 on, DoorDash belongs to this skill alone and those entries carry no 1239 lines. A `3rd Party` entry dated in a posted week with a nonzero 1239 line books that store's DoorDash fee twice: report it and leave it for the human.

## Verifying the run

Rerun `gl-detail.sh` and read 1239 by store: the trued-up week's sales less its deposit less its `DoorDash` credit is 0.00, and the estimated week's `DoorDash` credit equals its estimate. All Transactions, Number contains `door`, shows four `DoorDash` rows per Sunday, each Approved at its store with `fee` as its Amount.

Report a table per store: the prior Sunday's estimate, its actual and the change, then the new Sunday's sales, rate and estimate, then any `3rd Party` entry still carrying 1239. Close the session by name: `playwright-cli -s=fdd close`. Other skills run their own sessions on this machine, so never use `kill-all` or `close-all`.

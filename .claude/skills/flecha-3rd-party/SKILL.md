---
name: flecha-3rd-party
description: Post the weekly 3rd Party fee journal entry into Flecha Restaurant365, one Corporate entry estimating each store's EZ Cater and Foodja fees at 30% of the week's sales from 1237 - AR - EZ Cater and 1238 - AR - Foodja to 7161 - Delivery Fees, read from the GL Account Detail report. Use when asked to post, balance, or approve the Flecha 3rd Party entry in R365, or to check a Flecha store's EZ Cater or Foodja receivable.
---

# Flecha 3rd Party fees, weekly

There is no portal access for EZ Cater or Foodja at Flecha, so the fee is an **estimate**: each store's Monday to Sunday sales on the account × 30%. Every 3rd Party entry from 7/5 to 9/13/2026 that was neither a copied week nor a catch-up booked exactly 30.0% of the store's same-week sales, and the user set that historical rate as the basis on 10/6/2026. `RATE=0.28` overrides it.

Each week is one Journal Entry numbered `3rd Party`, dated the **Sunday**, header at `100 - Corporate`, lines at the stores. Per store:

```
credit  1235 - A/R - 3rd Party Delivery   Uber Eats sales x 30% (weeks through 10/4/2026 only)
credit  1237 - AR - EZ Cater              EZ Cater sales x 30%
credit  1238 - AR - Foodja                Foodja sales x 30%
debit   7161 - Delivery Fees              sum of the store's credits
```

A store or account with no sales that week gets no line. Negative sales flip the line's side. DoorDash (1239) and Grubhub (1242) left this entry on 8/30/2026, and Uber Eats (1235) on 10/11/2026, for `flecha-doordash`, `flecha-grubhub` and `flecha-ubereats`; a 3rd Party entry carrying 1239 or 1242, or 1235 from 10/11 on, books that fee twice. `estimate.js` drops 1235 from weeks ending 10/11/2026 or later.

| GL store | Location |
|---|---|
| Flecha HB | `101 - Flecha HB` |
| Flecha Town Square | `102 - Flecha Town Square` (no Foodja) |
| Flecha 4S Ranch | `103 - Flecha 4S Ranch` |
| Flecha NB | `104 - Flecha NB` |

Account and location GUIDs live in `scripts/ids.js`. Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/flecha-doordash/scripts/r365-login.sh f3p
```

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting anything new; the same R365 build serves Flecha.

## Step 1: GL detail

Run after the Sunday's Daily Sales Summaries are in. Pull each account from the first Monday to the latest Sunday:

```bash
for a in 1237 1238; do bash <skill>/scripts/gl.sh f3p $a <Monday> <Sunday> > gl$a.txt; done
node <skill>/scripts/estimate.js <Sunday>...
```

`gl.sh` opens GL Account Detail by URL with Show Unapproved on, so an unapproved Daily Sales Summary still counts. `estimate.js` prints each store's sales, DSS days found and fee per account, and writes `week-<M-D-YYYY>.json`. Sales are the `JE000xxxxx` Journal Entries; Bank Deposits and other entries are ignored.

Check the days column before posting: an account showing 1 to 3 days at a store is normal for EZ Cater and Foodja (catering days), so judge each against its own run of weeks.

## Step 2: post

```bash
bash <skill>/scripts/post-week.sh f3p week-<M-D-YYYY>.json <prior 3rd Party TransactionId>
```

It duplicates the prior week's entry through `flecha-doordash/scripts/duplicate.sh`, sets date, number and header comment, confirms the header reads `100 - Corporate`, rebuilds the lines with `norms-weekly-change-orders/scripts/load-lines.sh`, saves, reloads, and prints `check-lines.js`'s store table and `MATCH`. Close tab 1 between weeks so the next duplicate finds its copy tab. For several weeks, post in date order, each duplicating from the one before.

The entry is left **Unapproved**. Re-read it, then approve on the user's word with `bash <skills>/flecha-doordash/scripts/approve.sh f3p <id>`. A `FAIL` after the `id` line leaves a saved copy: finish it with `REDO=<id> post-week.sh f3p <week json> x` rather than duplicating again.

## Latest entries

Update after every run. The next run duplicates from the newest.

| Sunday | TransactionId | Total | Status |
|---|---|---|---|
| 9/20/2026 | `1653a85c-d9b1-44e7-8204-05742fac9ea4` | 6,363.76 | Approved |
| 9/27/2026 | `4e359567-8796-4055-b439-23d33c5daabe` | 5,542.91 | Approved |
| 10/4/2026 | `5fdc5a8c-6a6b-4b59-b687-8996a0dde41e` | 3,130.72 | Approved |

## The cleanup entry

The 30% estimate runs below what the deposits imply (deposits came to about 46% to 61% of sales over August and September 2026), and the old entries copied weeks forward, so 1235, 1237 and 1238 grew from 28.3K on 8/1 to 38.3K on 10/4/2026. `cleanup.js` sized a one-time reclass per store and account to `1210 - Accounts Receivable` (the user chose 1210 over 7161), dated 8/24/2026 and numbered `3rd Party Cleanup`, that leaves each balance at the sales still awaiting payout net of the 30% fee: the last week for Uber Eats and EZ Cater (weekly payouts) and the last two weeks for Foodja (biweekly).

```bash
for a in 1235 1237 1238; do BYLOC=1 bash <skill>/scripts/gl.sh f3p $a 8/24/2026 <Sunday> > loc$a.txt; done
node <skill>/scripts/cleanup.js <Sunday> 8/24/2026
```

Run it after the Sunday's estimate is posted, since the pull counts unapproved entries. It writes `cleanup.json` in the weekly format for `post-week.sh`. Posted and approved 10/6/2026 as `38cd459b-b855-47ec-a85b-49650755e11c`, 28,960.80 net to 1210, sized against 10/4/2026; the 10/4 balances then read 1,719.83 (1235), 3,899.38 (1237) and 3,694.36 (1238). Rerun it only if the user asks for another cleanup. Every Foodja deposit is coded to HB, so HB's Foodja line runs the other way (a 3,252.02 debit) and HB's 1210 line is a 2,014.33 credit.

## Verifying the run

All Transactions, Number contains `3rd`, shows one `3rd Party` row per Sunday at Corporate with the estimate total. Report a table per week of store, account, sales, days and fee, the entry ids and status, and anything outside the usual pattern. Close the session by name: `playwright-cli -s=f3p close`. Other skills run their own sessions on this machine, so never use `kill-all` or `close-all`.

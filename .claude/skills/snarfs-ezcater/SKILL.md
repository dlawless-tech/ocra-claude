---
name: snarfs-ezcater
description: Enter the weekly Snarf's EZ Cater Fees journal entries into Restaurant365 (snarfsstl), one per store and weekly EZ payout, clearing 10150 EZ Cater against 70470 EZ Cater Fees and 42060 Customer Refund from EZ Cater's orders, then report to the TPD channel. Use when asked to enter, post, or approve the Snarf's EZ Cater entries in R365, to pull Snarf's EZ Cater orders, or to check 10150 against the Payoneer deposits, or when the Friday scheduled run starts it.
---

# EZ Cater orders into the Snarf's EZ Cater Fees entries

Same logic as `norms-ezcater`, on Snarf's data. Four steps: **read** the week's EZ Cater orders and the 10150 GL detail, **plan** each store's lines with `plan.js` and `entries.js`, **enter** one entry per store, then **approve** and **report**.

Run every command from one work directory, `.scratch/snarfs-ezcater/wk<MMdd of the Sunday>`. `playwright-cli` binds sessions to the working directory, and a `cd` mid run strands them. `<scripts>` below is this skill's `scripts/` folder, written absolute. Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting anything else in R365.

## Logins

Both live in `~/.claude/snarfs-credentials.md`: R365 under its heading, EZ Cater under `## EZ Cater` (mark+04@ocra-us.com).

```bash
bash <scripts>/ez-login.sh sez     # EZ Cater Partner Portal
bash <scripts>/r365-login.sh sezj  # R365, entries
bash <scripts>/r365-login.sh sezb  # R365, GL report
```

`ez-login.sh` runs on the saved profile `~/.claude/playwright-profiles/snarfs-ezcater`, where **Remember this device for 30 days** keeps the device known. When EZ mails a code to mark+04@ocra-us.com it ticks that box and exits 2: the code is for the human, typed into that same window.

## The payout

Each entry is one EZ **payout**: Payoneer pays each store on Tuesday (`PAYONEER 7362` Bank Deposits on 10150) the Caterer Total Due of the orders **delivered** the Monday to Sunday before, Central time. The entry is numbered `EZ Cater Fees`, dated that Sunday, and covers exactly those orders, so its due equals the deposit to the cent. EZ pays nothing on a cancelled order, whatever the portal's cancel figure says.

R365's daily sales book an EZ order to 10150 on the day it is **placed**, often a week or more before delivery. Each order therefore brings its own R365 sale into its payout's entry, whatever day R365 booked it; calendar weeks of R365 sales never decide an entry.

The first entries are the 8/23/2026 payout (go-live 8/19). Before them the only fee booked was a hand entry, `EZ Cater`, Page 8/31/2026, 90.20, covering August's orders; `plan.js` spreads it over those orders' fees.

## Read

**Orders.** The Partner Portal has no reports page; the orders come from the GraphQL API behind its order lists.

```bash
bash <scripts>/ez-orders.sh sez 2026-08-01 <Sunday + 90 days YYYY-MM-DD> orders.json
```

Each order carries `store`, `sub_at`, `at` (event), `status`, `total` and `due` (Caterer Total Due). Cancelled orders come back with total and due 0. The span starts at go-live, since `plan.js` re-pairs every 10150 sale since then (from 9/13 a 9/9/2026 Skinker sale paired with a later order in the 10/25/2026 run), and reaches forward for orders delivered well after the week, which the check needs. An order placed weeks ahead whose delivery falls outside the span reads as a sale with no order, as Page's 7W4Y1M did in the 10/11/2026 run.

**GL.** Run from go-live through today so the balance holds every deposit:

```bash
bash <scripts>/gl/gl-detail.sh sezb 8/1/2026 <today M/D/YYYY> $PWD/gl.csv
node <scripts>/gl-rows.js gl.csv > gl.json
```

## Plan

```bash
node <scripts>/plan.js gl.json orders.json <first Sunday YYYY-MM-DD> <last Sunday YYYY-MM-DD> > plan.json
node <scripts>/entries.js plan.json > entries.json
```

A weekly run passes the same Sunday twice; a catch-up passes a range. Per store and payout, with **D** the R365 sales of the payout's orders:

| Comment | GL | Amount |
|---|---|---|
| `r365 ez cater sales - caterer total due` | 10150 - EZ Cater | D - due, credit if positive |
| `ez cater order total - caterer total due` | 70470 - EZ Cater Fees | order total - due, less the hand fee entry |
| `r365 sales - ez cater order total` | 42060 - Customer Refund | the rest, debit if positive |

**Pairing a sale with its orders**, in order: one order to within 0.10; two or three summing to it; the nearest order within 10%; two or three within 10% of their total. A sale pairs only with orders placed up to a day after it and delivered no earlier than a day before it. One sale covering orders in two payouts splits between them by order total. A recon credit (`20100 Recon`, "cancelled in Toast") cancels the earlier sale of the same amount, or reduces the sale whose remainder then pairs with its orders. A sale matching no order amount goes with the order placed within a day of it; one with no order near it stays in the payout of its date. 42060 then holds only real disagreements between R365 and EZ, and every one is named in the entry's `warnings`.

**Orders rung at another store.** When Toast rang an EZ order at a different store than EZ paid, the sale stays where Toast put it and the money follows it: in the paying store's Payoneer deposit, split the 10150 line, crediting the order's full total to 10150 at the selling store and debiting its fee to 70470 there, so the net stays the deposit. R365 makes the due to / due from entry itself (user, 10/24/2026). `plan.js` then treats the order's due as its total, so the selling store's entry books no fee for it. The order then goes in `scripts/order-stores.json` (`{"<order>": "<selling store>"}`), so `plan.js` books it with the selling store. MX's 10/20/2026 deposit BD027031 carries Skinker's YE1G6C this way: 10150 167.80 less 70470 34.08, of 369.62.

**Advances.** An approved entry that already took a sale for a later delivery is fixed by moving that part of its 10150 credit to `20100 - Customer Advance Orders` (user, 10/24/2026), and the order goes in `scripts/advances.json` with its store, order, amount and the entry's date. The payout that carries the order then adds Dr 20100 / Cr 42060 for that amount, commented `advance ez order <order> delivered`. An advance whose order is cancelled or missing from `orders.json` shows in that store's `check.warnings`. Open now: Page 7W4Y1M 192.67, parked 10/11/2026, delivered 11/16/2026, so it clears in the 11/22/2026 entry. Store and account ids live in `stores.json`.

**The check.** Every entry's `deposit` equals its `due`; a payout with no deposit yet, or a different one, is a warning. `plan.json` also holds `check`, one row per store at the last Sunday: 10150 after the planned entries equals the due still unpaid plus `ahead`, the R365 sales already booked for orders delivered later. `off` is 0 for every store; anything else is a misplaced deposit or an entry to fix (Kirkwood's 9/1/2026 Payoneer line sat in Spirit's deposit until 10/15/2026).

## Enter

```bash
bash <scripts>/enter-entry.sh sezj entries.json "<store>|<M/D/YYYY>"
```

One entry per call. It duplicates the source entry (`_source` in `stores.json`, the 8/31 Page hand entry), answers "No, transaction only", sets date, number, location and the three lines, saves, checks the `SaveTransaction` body, reloads and reads back every line. It prints `<key> SAVED <id> <amount>` and leaves the entry unapproved. Before entering, run `bash <scripts>/find-entries.sh sezj` for the `EZ Cater Fees` entries that exist; one at the same store and date is rewritten in place with `EDIT=<id>`, never duplicated. A failure after Duplicate leaves an `NJ` copy to delete.

## Approve

`bash <scripts>/bulk.sh sezj Approve Unapproved [id...]` filters All Transactions to the `EZ Cater Fees` entries in that status (only those ids, when given), selects all and runs Edit Selected > Approve; `Unapprove` and `Delete` work the same way. `bash <scripts>/approve.sh sezj <id>...` approves one entry at a time through its form. Approve on the human's word, or in the unattended run per its rules. Re-read with `find-entries.sh` afterwards.

## Report

Write `result.json` in the work directory and post it with `powershell -File <scripts>/notify-teams.ps1 -Title "Snarf's EZ Cater Fees, week <Mon> - <Sun>" -ResultFile result.json` (`-DryRun` prints the lines). It posts to the Snarf's TPD channel and tags Collin, from `~/.claude/snarfs-ezcater.json` outside the repo.

```json
{ "week": "10/5/2026 - 10/11/2026", "entryDate": "10/11/2026", "note": "",
  "stores": [ { "store": "Page", "status": "approved", "fee": 207.34, "difference": 192.70, "amount": 400.04, "transactionId": "...", "warnings": [] } ] }
```

`status` is `approved`, `entered (unapproved)`, or `failed`. Close the sessions this run opened, by name, from the work directory.

## Unattended run

`<scripts>/friday-run.ps1` runs from Task Scheduler on Fridays at 11:00 (`<scripts>/register-task.ps1` sets it up). It takes the week that ended the Sunday before, writes `done.txt` once the week is reported (`-Force` reruns, `-Date yyyy-MM-dd` stands in for today), and starts this skill headless with a prompt beginning `Unattended run`, naming the week, the entry date and the work directory. No human answers during the run, so:

- `cd` into the work directory once, before opening any session. Use session names `sezu`, `sezju` and `sezbu`.
- When `ez-login.sh` exits 2, leave `sezu` open on the code page, write `result.json` with `"stores": []` and `"note": "EZ Cater mailed a code to mark+04@ocra-us.com"`, close `sezju` and `sezbu`, and stop. Once the human types the code, rerunning `friday-run.ps1` picks the week up.
- Enter every store with activity. A store whose `check` and `warnings` are clean is approved; a store with any warning stays `entered (unapproved)` with the warnings listed. A store failing a step is `failed`, with the step in `warnings`, and the others carry on.
- Change only the week's own entries. An earlier week that no longer ties goes in `warnings`.

Finish by closing the sessions by name, then write `result.json`. The wrapper posts it to Teams, tagging Collin.

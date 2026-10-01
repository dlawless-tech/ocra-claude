---
name: fare-ubereats
description: Post the weekly Uber Eats fee journal entries into FARE Restaurant365, one per store, clearing 1111 Uber Eats Deposit Clearing against marketplace fees, marketing, chargebacks and marketplace facilitator tax from each store's Uber pay breakdown. Use when asked to post, balance, or approve the FARE UberEats Fees entries in R365, or to pull a FARE store's weekly Uber Eats figures.
---

# FARE Uber Eats fees, weekly by store

Each week, Monday to Sunday, posts one Journal Entry per store numbered `UberEats Fees`, dated the **Sunday**, header location the store, every line at the store. Two phases: **read** every store from Uber, then **post**.

Through August 2026 this was one monthly entry at `10100 - FARE Holding LLC` covering every store, with the Uber monthly statements attached. The first weekly entry is dated 9/6/2026 and covers 9/1 to 9/6, since 8/31 sat in the August monthly. Every later week is the full Monday to Sunday.

Sessions carry names of their own, `fue-uber` and `fue-r365`, since other FARE skills drive browsers on the same machine and a bare or shared name gets closed under you. Work from one directory for the whole run:

```bash
playwright-cli -s=fue-uber open --headed https://merchants.ubereats.com/manager/
bash <skill>/scripts/r365-login.sh fue-r365
```

Other sessions edit these scripts too, and bash reads a script as it runs, so an edit mid run breaks a store with a parse error. Copy `scripts/` (and the sibling `bowery-ubereats`, `danny-coops-payroll` and `bowery-weekly-mgmt-fees` scripts it calls) to the working directory and run the copy.

## A week in one command

```bash
bash <skill>/scripts/run-week.sh 2026-09-21 2026-09-27 9/27/2026 ids-2026-09-20.txt ids-2026-09-27.txt
```

It runs both phases below for every store and writes `<uber store>|<TransactionId>` for each approved store to the out file, which is the next week's prior file. `SKIP_READ=1` posts from an existing `week.txt`. A store that fails is reported and skipped; finish it by hand with the steps below.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365; the same build serves FARE.

## Logins

Credentials live in `~/.claude/fare-credentials.md`, outside any repo: R365 `tlaroche`, Uber `mark+33@ocra-us.com`. Uber mails a 4-digit code: fill the email, click Continue, then hand the keyboard over for the code and say so.

## Phase 1: read Uber

Land on Payments > Payouts (`/manager/payments?restaurantUUID=...`), then:

```bash
bash <skill>/scripts/read-week.sh 2026-09-07 2026-09-13
```

It loads the **Custom Range** (`start`, `end`, `rangeType=1` in the URL), walks the ten stores in `scripts/stores.json` through the store picker, expands every Pay breakdown row, writes `week.txt`, and saves each store's expanded page to `backup/` as the entry's attachment. Uber's own Download button only queues a report for hours later and Statements are monthly, so the saved page is the weekly backup. The picker takes only a real click on the store name by snapshot ref, and the range survives the switch. The `restaurantUUID` in the URL follows the picked store, so a hand-typed uuid for another store is how every block comes back as one store's figures. Each block's header carries the store name read off the page, and `build-lines.js` refuses a block whose page name disagrees.

```bash
node <skill>/scripts/build-lines.js week.txt 9/13/2026 > lines.json
```

## The lines

| Uber row | GL | Comment |
|---|---|---|
| Uber Fees (Marketplace Fee) | Dr 7380 - Uber Eats Third Party Fees | `marketplace fees` |
| Marketing: Offers on items | Dr 4905 - Third Party App Marketing Comps | `offers on items` |
| Marketing: Ad Spends | Dr 7630 - Uber Eats Marketing | `ad spends` |
| Net Chargeback Amount (top row) | Dr 7535 - Third Party Refunds | `net chargeback` |
| Net Taxes less Tax on Earnings less Backup Withholding | Dr 2270 - Sales Tax Payable | |
| Backup Withholding Tax | Dr 2270 - Sales Tax Payable | `backup withholding` |
| Other payments: Backup Withholding Reimbursement | Cr 2270 - Sales Tax Payable | `backup withholding reimbursement` |
| net of the above | 1111 - Uber Eats Deposit Clearing, opposite side | |

The 2270 line is Marketplace Facilitator Tax plus the tax on chargebacks and offers, which lands equal to Tax on Earnings. The check: the debits equal `Earnings + Tax on Earnings - Total payout`. `build-lines.js` stops on a store that misses it, and on any top-level row outside Earnings, Uber Fees, Marketing, Net Chargeback Amount, Other payments, Net Taxes and Total payout, and on Other payments holding anything beyond the withholding refund. Report each stop to the human and ask how it books.

**Backup Withholding Tax** is the 24% Uber withholds from some stores' payouts (Lakeview and Old Town in September 2026), shown as `Adjustments` on the monthly statement. It books to 2270 on its own line, as the human chose on 9/30/2026, and the line scripts key on GL plus comment so 2270 carries every line. Uber refunds it later as Other payments (both stores on 9/27/2026), which credits 2270 and can flip 1111 to a debit.

A store with no sales still gets its entry, every line at 0.00 and the header and line comments `no sales this week`, so the week reads as reviewed. `post-store.sh` clears the header comment on a week with sales, since the copy inherits it from a zero week. R365 keeps a stale header Amount on an all-zero entry, so the grid can show a figure the lines do not carry; read the lines.

## Phase 2: post

```bash
bash <skill>/scripts/post-store.sh fue-r365 lines.json "FARE (Lakeview)" <source TransactionId>
```

The source is the prior week's entry for that store. For the 9/6/2026 week it was the 8/31 monthly `3259d454-adc7-4d89-bcdb-4ff21b2203fc`. The script duplicates the source (transaction only), dates and numbers the copy, sets the header location, removes other stores' lines with trash clicks, trims doubled and unused GLs, adds missing ones, sets amounts, saves, reloads, and prints the `check-lines.js` table. Read `MATCH` for each store. Close the extra tabs between stores, since `duplicate.sh` picks the newest copy tab.

R365 writes the copy on the Duplicate click, before it is dated or numbered, so a run that fails mid duplicate leaves an unapproved `NJ000xxxxx` entry dated today at the store. Find it in All Transactions and finish it rather than duplicating again: pass its id as the fifth argument to `post-store.sh`. Other FARE skills leave `NJ` copies too; leave those alone.

Then, per store with `MATCH`:

```bash
bash <skill>/scripts/attach.sh fue-r365 <id> "backup/Uber <start>_<end>_<store>.pdf"
bash <skill>/scripts/approve.sh fue-r365 <id>
```

R365 takes an upload only on a saved entry. `approve.sh` clicks Approve, then Approve and Close, and confirms the ribbon flipped to Unapprove after a fresh load; a same-hash `goto` does not reload. Approve every store once it reads `MATCH` with its attachment, the zero store included.

## Verifying the run

All Transactions, filter Date to the Sunday and read the grid's data source (see `R365-AUTOMATION.md`): ten `UberEats Fees` rows, one per store, each at its store with the planned amount. Every row reads Approved. Report the store table, the withholding per store, and any zero store.

## Closing the windows

Once every week of the run is approved and reported, close both browsers from the run's working directory:

```bash
bash <skill>/scripts/close.sh
```

It closes `fue-uber` and `fue-r365` and confirms neither is left open. Close only these two by name, never every session, since other FARE runs keep their own browsers open on the same machine. Keep the Uber session open between weeks of one run, because reopening it costs a new emailed code. A correction afterward logs in to both sites again; close after it the same way.

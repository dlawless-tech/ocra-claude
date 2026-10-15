---
name: snarfs-customer-advance-orders-recon
description: Reconcile Snarf's 20100 Customer Advance Orders in Restaurant365 (snarfsstl) to Toast by store at month end, bridging each store's GL balance to its open advance orders, explaining every day the DSS booked differently from Toast, and clearing the residue. Use when asked to run the Snarf's customer advance orders recon, to tie out Snarf's 20100 or advance order deposits to Toast, or for Snarf's true advance order balances at a month end.
---

# Snarf's customer advance orders recon

A customer pays for a catering or scheduled order before the order's day. Each store's Daily Sales Summary (DSS) books that payment as a credit to `20100 - Customer Advance Orders` on the day it is paid, and debits it back out on the order's day. The account **ties** when each store's balance equals its **true balance**: Toast payments made on or before the end date for an order after it. Every true balance clears on its order's day, normally the following month.

The GL amount is the payment's amount + tip + gratuity. Voided and denied payments drop out. A business day starts at 4 AM.

The recon runs at **month end**, and the clearing entry is dated the month end, so October activity stays in October. The first run, for 9/30/26, cleared everything from 6/1 on; each later month starts from a tied balance.

Work from one fixed scratch folder for the whole run (`.scratch/snarfs-advance-orders`), since `playwright-cli` binds sessions to the folder and the scripts write their files there. `<scripts>` is this skill's `scripts/` folder.

## Setup

R365 logs in from `~/.claude/snarfs-credentials.md` (user tlaroche, same as other clients):

```bash
bash <scripts>/r365-login.sh snf
```

R365 keeps one session per user. While the human is logged in to Snarf's R365 as the same user, this session keeps bouncing to the login page and the GL step fails with `no Accounting tab on My Reports`. Ask the human to sign out for the run.

Toast runs in its own headed session. Open the sign-in page and have the human sign in and enter the code themselves; never type the Toast password:

```bash
playwright-cli -s=snt open --headed https://www.toasttab.com/restaurants/admin/home
```

## Run

`<end>` is the month end. Start the GL at the first of the month before it, and Toast about a month earlier still, so the payments behind the opening balance are covered.

1. **GL.** `UNAPPROVED=no ACCT="20100 - Customer Advance Orders" bash <scripts>/gl-detail.sh snf <start M/D/YYYY> <end M/D/YYYY> gl.csv`, then `node <scripts>/gl-parse.js gl.csv gl.json`. Approved entries only, so the balances are the balance sheet's. It prints each store's opening balance, row count, and closing balance. Every line is a DSS journal entry with no comment, except earlier `20100 Recon` entries.
2. **Toast.** `bash <scripts>/toast-advance.sh snt <from YYYY-MM-DD> <end YYYY-MM-DD> toast.json`. It pulls Toast's Payments report for all seven stores in two-week chunks of paid dates, and keeps each payment whose paid day differs from its order's day. A chunk takes 2 to 15 minutes, so run it in the background. A failed chunk is retried, and a rerun resumes at the first missing `toast-chunk-*.json`. Delete those files to pull fresh.
3. **Recon.** `node <scripts>/recon.js gl.json toast.json <end YYYY-MM-DD> recon.json`. Per store, it prints the GL balance, the true balance, and the difference split three ways: carried in at the start, day exceptions, and unexplained. **Unexplained must be 0.00.** If it is not, a GL line or a Toast chunk is missing; find it before going on. `recon.json` also carries each store's `months`: GL, true balance, and difference at every month end.
4. **Explain** every day exception, below.
5. **Workbook.** `powershell -File <scripts>/workbook.ps1 -Recon recon.json -Out "C:\Users\trici\OCRA\Snarf's - General\Reports\Customer Advance Orders\Snarfs Customer Advance Orders Recon <end YYYY-MM-DD>.xlsx"`. It writes Summary and By month tabs, plus one tab per store with its open orders and day exceptions.
6. **Report** each store's GL, true balance, and difference, with the cause of each difference, and the clearing plan from step 1 of Clearing. Clear only after the human approves it.

## Reading day exceptions

A day exception is a day when the GL differs from Toast's advance payments. `recon.json` lists the Toast payments behind each one. To see what a DSS booked, rerun `gl-detail.sh` with `KEEP=1` for that day, which leaves the report tab open. Read the `entityId` from the entry's NJ link, then run `bash <scripts>/read-dss.sh snf <entityId>`.

- **Late payments.** A payment made after its order's day: an order still unpaid when the DSS was imported, a cash edit to a closed check, or a card tip adjustment. The order day's DSS books the full sales, tax and tip, and plugs the unpaid part as a **debit to 42060 Customer Refund**. The later payment credits 20100. The residue in 20100 mirrors that 42060 debit, so it clears to 42060. No sales are missing (Kirkwood order 70: 261.02, ordered 9/2/26, paid 9/9). Most months these are a few dollars a store; Kirkwood has the most.
- **Partial refunds.** An advance order refunded in part is released at the refund amount, and the rest stays behind (SLU order 1 on 9/8/26: 390.66 paid, 344.71 released, 45.95 left). It clears to 42060.
- **EZ Cater cancellations.** The DSS credits 20100 and debits `10150 - EZ Cater` for an EZ Cater order that no longer exists in Toast, even after searching every payment that day. It clears to 10150 (Page 9/3/26 1,183.58; SLU 8/19 304.91; Skinker 10/6 560.60). Check 10150 that EZ Cater never paid it.
- **House account charges.** The DSS credits 20100 and debits `10060 - House Accounts` with no Toast payment (SLU and Fenton on 8/14/26, later moved out of 10060 by a Rent Credit AJE). The human corrected those two DSS entries; report any new one and leave it for the human.
- **Anything else.** Report the NJ number for the human to open in R365.

## Clearing

1. **Plan.** `node <scripts>/build-clear.js recon.json clear.csv [--ez "<store>=<amt>"]... [--leave "<store>=<amt>"]...`, with stores named as in the store map's first column without the prefix (`"2 - SLU=304.91"`). Each store with a difference gets one entry, numbered `20100 Recon <M.D>` and dated the end date. It debits 20100 by the difference less any `--leave`, credits 10150 for the `--ez` part, and puts the rest to 42060 (a debit when the rest is negative). It refuses a store with unexplained differences.
2. **Import.** `bash <scripts>/import.sh snf clear.csv <entries>`. The entries land Unapproved.
3. **Verify.** Rerun Run steps 1 and 3 with the default Show Unapproved (drop `UNAPPROVED=no`). Every cleared store must show 0.00 difference, apart from its `--leave` amount.
4. **Approve.** Find the entries on All Transactions (Number contains `20100 Recon`), then `bash <scripts>/approve.sh snf <id>...`.

Unapproving or deleting an approved entry needs the human's explicit OK for that entry. `unapprove.sh` unapproves; delete is the entry's Action > Delete, then Yes.

## Store map

| R365 location | Number | Toast restaurant |
|---|---|---|
| Snarf's Sandwiches 1 - MX | 10100 | MX |
| Snarf's Sandwiches 2 - SLU | 10400 | SLU |
| Snarf's Sandwiches 3 - Skinker | 10300 | Skinker |
| Snarf's Sandwiches 4 - Page | 10200 | Maryland Heights |
| Snarf's Sandwiches 5 - Fenton | 10700 | Fenton |
| Snarf's Sandwiches 6 - Kirkwood | 10800 | Kirkwood |
| Snarf's Sandwiches 7 - Spirit | 10900 | Chesterfield |

The Toast restaurant ids are in `toast-advance.js`. They come from the location picker on Toast's legacy reports page (`script#target-owner-picker-client-render-nodes`, group SNARF'S SAINT LOUIS).

## Quirks

- Toast's Payments report is filtered by **paid date** and shows each payment's **Order Date**, which is how advance payments are found. It runs as a job: a POST returns a `Location` on S3 that is polled until it returns 200. Fetch the S3 url with no custom headers, or the browser blocks it.
- Each Toast job blanks the hidden columns on a random share of its rows. The script reruns the job and merges rows by payment id until every row has both dates, and keeps the merged rows on the page between tries.
- Toast payments older than a few months come back without order and check ids. The match does not need them.
- R365's Import Journal Entry file button is a hidden input a click cannot reach, so `import.sh` hands the file to it inside the page.

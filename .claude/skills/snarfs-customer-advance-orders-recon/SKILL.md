---
name: snarfs-customer-advance-orders-recon
description: Reconcile Snarf's 20100 Customer Advance Orders in Restaurant365 (snarfsstl) to Toast by store, bridging each store's GL balance to its open advance orders and listing every day the DSS booked differently from Toast. Use when asked to run the Snarf's customer advance orders recon, or to tie out Snarf's 20100 or advance order deposits to Toast.
---

# Snarf's customer advance orders recon

A customer pays for a catering or scheduled order before the order's day. Each store's Daily Sales Summary (DSS) books that payment as a credit to `20100 - Customer Advance Orders` on the day it is paid, and debits it back out on the order's day. The account **ties** when each store's balance equals its **open advance orders**: Toast payments made on or before the end date for an order after it.

The GL amount is the payment's amount + tip + gratuity. Voided and denied payments drop out. A business day starts at 4 AM.

Work from one fixed scratch folder for the whole run (`.scratch/snarfs-advance-orders`), since `playwright-cli` binds sessions to the folder and the scripts write their files there. `<scripts>` is this skill's `scripts/` folder.

## Setup

R365 logs in from `~/.claude/snarfs-credentials.md` (user tlaroche, same as other clients):

```bash
bash <scripts>/r365-login.sh snf
```

Toast runs in its own headed session. Open the sign-in page and have the human sign in and enter the code themselves; never type the Toast password:

```bash
playwright-cli -s=snt open --headed https://www.toasttab.com/restaurants/admin/home
```

## Run

The default window is the last 60 days, ending on the last day the DSS has posted (normally yesterday).

1. **GL.** `ACCT="20100 - Customer Advance Orders" bash <scripts>/gl-detail.sh snf <start M/D/YYYY> <end M/D/YYYY> gl.csv`, then `node <scripts>/gl-parse.js gl.csv gl.json`. It prints each store's beginning balance, row count, and last balance. Every line is a DSS journal entry with no comment.
2. **Toast.** `bash <scripts>/toast-advance.sh snt <from YYYY-MM-DD> <end YYYY-MM-DD> toast.json`. Start it about 75 days before the GL start, so the payments behind the balance carried in at the start are covered. It pulls Toast's Payments report for all seven stores in two-week chunks of paid dates and keeps each payment whose paid day differs from its order's day. A two-week chunk takes 2 to 15 minutes, so run it in the background. A chunk that fails is retried; rerunning the script resumes at the first missing `toast-chunk-*.json`.
3. **Recon.** `node <scripts>/recon.js gl.json toast.json <end YYYY-MM-DD> recon.json`. Per store, it prints the GL balance, Toast's open advance orders, and the difference split three ways: carried in at the start, day exceptions, and unexplained. **Unexplained must be 0.00.** If it is not, a GL line or a Toast chunk is missing; find it before going on.
4. **Workbook.** `powershell -File <scripts>/workbook.ps1 -Recon recon.json -Out "C:\Users\trici\OCRA\Snarf's - General\Reports\Customer Advance Orders\Snarfs Customer Advance Orders Recon <end YYYY-MM-DD>.xlsx"`. It writes a Summary tab, plus one tab per store with its open orders and day exceptions.

The run is done when every store bridges with 0.00 unexplained and every day exception is explained by its Toast cause, or reported as having none.

`recon.json` also carries each store's `months`: the GL balance, Toast's open advance orders, and the difference at every month end. The Toast figure is the store's true balance outstanding.

## Reading day exceptions

A day exception is a day when the GL differs from Toast's advance payments. `recon.json` lists the Toast payments behind each one. To see what a DSS booked, rerun `gl-detail.sh` with `KEEP=1` for that day, which leaves the report tab open. Read the `entityId` from the entry's NJ link, then run `bash <scripts>/read-dss.sh snf <entityId>`.

- **Late payments.** A payment made after its order's day: an order still unpaid when the DSS was imported, a cash edit to a closed check, or a card tip adjustment. The order day's DSS books the full sales, tax and tip, and plugs the unpaid part as a **debit to 42060 Customer Refund**. The later payment credits 20100. The residue in 20100 mirrors that 42060 debit, so it clears to 42060 (Kirkwood order 70: 261.02, ordered 9/2/26, paid 9/9). No sales are missing.
- **Partial refunds.** An advance order refunded in part is released at the refund amount, and the rest stays behind (SLU order 1 on 9/8/26: 390.66 paid, 344.71 released, 45.95 left). It clears to 42060.
- **EZ Cater cancellations.** The DSS credits 20100 and debits `10150 - EZ Cater` for an EZ Cater order that no longer exists in Toast. It clears to 10150 (Page 9/3/26 1,183.58; SLU 8/19 304.91; Skinker 10/6 560.60).
- **House account charges.** The DSS credits 20100 and debits `10060 - House Accounts` with no Toast advance payment (SLU 8/14/26 709.03; Fenton 8/14 884.05). These were left open on 10/15/26 for the human to decide; ask before clearing one.
- **Anything else.** A GL credit that matches nothing in Toast. Report the NJ number for the human to open in R365.

## Clearing

Clear only what the human approves. One entry per store, numbered `20100 Recon <M.DD>`, dated the end date, Standard type. Debit 20100 by the store's difference, and credit 10150 for its EZ Cater cancellations and 42060 for the rest (a debit to 42060 when the rest is negative). Build the import CSV in the format of the `Bowery payroll import` (`JENumber,Type,Date,ReversalDate,JEComment,JELocation,Account,Debit,Credit,DetailLocation,DetailComment`), using the location numbers in the store map. Then:

```bash
bash <scripts>/import.sh snf clear.csv 7     # entries land Unapproved
```

Rerun steps 1 and 3. Every cleared store must now show 0.00 difference. Then find the entries on All Transactions (Number contains `20100 Recon`) and `bash <scripts>/approve.sh snf <id>...`.

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

## Toast report quirks

- The Payments report is filtered by **paid date** and shows each payment's **Order Date**, which is how advance payments are found. It runs as a job: a POST returns a `Location` on S3 that is polled until it returns 200. Fetch the S3 url with no custom headers, or the browser blocks it.
- Each job blanks the hidden columns on a random share of its rows. The script reruns the job and merges rows by payment id until every row has both dates, and keeps the merged rows on the page between tries.
- Payments older than a few months come back without order and check ids. The match does not need them.

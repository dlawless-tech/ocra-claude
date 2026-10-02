---
name: dlena-stripe-deposits
description: Record dLena's Stripe payouts in Restaurant365 as Bank Deposits on the 1123 dLena Deposits / Income 4001 account, one per payout, split into Tripleseat receivable, banquet deposits, no-show income and card fees from the payout's Stripe export. Use when asked to post, match, or record dLena Stripe deposits or payouts in R365, or to check a dLena deposit against Stripe.
---

# dLena Stripe payouts into R365 Bank Deposits

Stripe pays out event and OpenTable charges to the bank account ending 4001, and each payout lands on R365's Bank Activity page as an unmatched `STRIPE/TRANSFER UNO AT 5TH K LLC` credit on `1123 - dLena Deposits / Income 4001`. Each one becomes a Bank Deposit created from that bank line, its Adjustments tab split from the payout's Stripe export, with the export attached.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for the login and the side-menu walk, and [`../bowery-bank-downloads/SKILL.md`](../bowery-bank-downloads/SKILL.md) under **The page's quirks** for the Bank Activity account dropdown and the refresh warning. Work in one directory for the whole run, since `playwright-cli` binds sessions to it.

## Step 1: log in

R365 is `https://unoatfifth.restaurant365.com`, on the same R365 login as Bowery. `bowery-ubereats/scripts/r365-login.sh` hardcodes the Bowery host, so run a copy with the host swapped:

```bash
sed 's/bowerygroup\.restaurant365\.com/unoatfifth.restaurant365.com/g' <skills>/bowery-ubereats/scripts/r365-login.sh > login.sh
bash login.sh dl
```

Stripe is `https://dashboard.stripe.com/login`, account `acct_1JKplFAju1EvNWw5` (Dlenadc), in a headed session `st`. Sign-in texts a 6-digit code to the phone ending 8525; ask the human for it, or to type it into the open window. On a **review your account info** prompt, choose **Skip for Now**.

## Step 2: the unmatched Stripe lines

In R365 open Accounting > Banking > Bank activity (it opens in a second tab; the page is `/#/form/BankActivityForm/00000000-0000-0000-0000-000000000000`), select `1123 - dLena Deposits / Income 4001`, and answer **No** to the refresh warning. Read the Unmatched grid:

```js
() => jQuery('#BankActivityUnmatchedGrid').data('kendoGrid').dataSource.data().toJSON().filter(r => /STRIPE/.test(r.Name)).map(r => [new Date(r.Date).toLocaleDateString(), r.Amount])
```

Each line pairs with one Stripe payout of the same amount on Transactions > Payouts (`<acct>/payouts`); the payout's id is the `po_...` in its row link. A payout Stripe shows as paid that has no bank line yet is not ready; leave it for the next run.

## Step 3: post each payout

```bash
bash <skill>/scripts/post-payout.sh dl st <po_id> <bank amount>
```

It checks the payout amount against the bank line, clicks **Export** on the payout's Transactions table and saves the file as `Stripe payout <YYYY-MM-DD> <amount>.csv`, builds the lines with `plan-lines.js`, clicks the bank line's **Deposit** link, keys each line through the Adjustments tab's new-row form (`add-lines.sh`), checks the Deposit Total equals the bank amount, attaches the export through **Upload File**, and clicks **Create Deposit**, which saves and approves in one step. It then reopens the saved deposit and runs `check-deposit.js`, which prints `MATCH Bank Deposit - BD000xxx <amount>` only when the date, every line, the Approved status and the attachment all agree. Each failure message says whether the deposit was created; one that was not leaves the bank line unmatched, so close the deposit window and rerun.

The deposit takes the bank line's date, which R365 prefills. At month end, date it by when Stripe collected the payout instead; stop and confirm the date with the human for any payout that crosses a month.

## The lines

One adjustment line per Stripe charge, at its **gross** amount, location `10200 - d'lena`:

| Charge | Account | Comment |
|---|---|---|
| `Payment for <event> at dLeña on <M/D/YYYY>`, event on or before the deposit date | 1218 - Tripleseat Receivable | `M/D/YY <event>` |
| the same, event after the deposit date | 2440 - Banquet Deposits | `M/D/YY <event>` |
| `OpenTable Experience: ... Reservation date HH:MM YYYY-Mon-DD` | 1218 or 2440 by reservation date | `M/D/YY OpenTable` |
| `OpenTable No-Show: ...`, all in the payout added into one line | 4915 - Cancellation Fee Income | `OpenTable NoShows` |
| a Refund row | the account its charge would take, by the same event date | the charge's comment, at the negative amount |
| the payout's fees, plus any `Stripe Fee` rows (`Stripe processing fees`, billed separately and often weeks old), less any `Application fee refund` adjustments, as one negative line | 8110 - Credit Card Fees | blank |

The comment always carries the event's full month, day and year; the name may be shortened (`plan-lines.js` drops `LLC` and `Inc`). A payout with several charges for one event keeps one line per charge, and a refund of one of them stays its own negative line. `plan-lines.js` stops with `STOP:` on any row it cannot place: an adjustment other than a fee refund, any other row type, or a description outside these patterns. Place those with the human and key the deposit by hand; nothing is created before that stop.

The new-row Amount box runs a calculator that swallows a typed minus and keeps the remaining balance, so `add-lines.sh` sets a negative amount on the form's model (`gridOptions.bankDepositDetailsGrid.newRowForm.model.amount`) and reads it back before **Add**. A fee line that happens to equal the remaining balance hides this; the read-back catches it.

## First run

9/28/2026, from the 9/16 payout BD000355 as the pattern. Posted BD000369 (9/21, $15,919.86), BD000370 (9/22, $651.36), BD000371 (9/23, $9,198.29), BD000373 (9/24, $15,179.82, two refunds and two fee refunds) and BD000372 (9/25, $2,333.92), each a `MATCH`.

---
name: bowery-mthly-vandypay-fees
description: Post the monthly VandyPay Fees journal entry into Bowery Group Restaurant365 for Cookshop, clearing 104-07 A/R - Vandy Pay to 632-02 Delivery Fees at the Adjustments Total on the month's UGRYD store statement, with the statement attached. Use when asked to prepare, post, or approve the Bowery VandyPay Fees entry in R365, or to pull Cookshop's VandyPay statement.
---

# Monthly VandyPay fees into the Cookshop journal entry

Cookshop sells through VandyPay at Vanderbilt University - MC. R365 books each day's VandyPay sales to `104-07 - A/R - Vandy Pay`, and VandyPay pays the day out net of its commission. Once a month this entry clears the month's VandyPay charges out of the receivable into Delivery Fees.

The source is the month's **Store Statement** in the VandyPay admin (UGRYD), store 11759. Its Summary block reads:

```
Total Requested Sales Amount       772.82
+ Total Requested Refund Amount      0.00
= Transaction Total                772.82 (A)
Non-Transaction Adjustments        -25.00     program fee, its own ACH debit
+ Transaction Fees                   0.00
+ Transaction Commissions          -25.13
+ Online Order TX Fees               0.00
= Adjustments Total                -50.13 (B)   the entry amount
= Net Total for Month              722.69
```

The entry amount is the **Adjustments Total**, shown positive, per the user on 10/2/2026. That total takes in any non-transaction adjustment, which VandyPay settles by its own ACH debit outside the daily payouts (September's 25.00 `Program fee - Sep 26` posted to the bank 10/1/2026). That bank debit is coded to `104-07 - A/R - Vandy Pay` at Cookshop, so the receivable nets to zero and the fee is expensed once, through this entry. Report each month's non-transaction adjustment with its ACH date so its bank line gets coded that way.

On the bank side VandyPay is `Orig CO Name:Off-Campus Advan` in `100-10 - Cash - Cookshop Operating (4360)`. Each day's payout arrives as a `Daily Slmt` deposit a day or two after the sale.

Wait for the user to confirm the month's VandyPay deposits are all in R365 before building the entry.

## Sessions

Work in one directory for the whole run, since `playwright-cli` binds sessions to it. Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365. Both logins read `~/.claude/bowery-credentials.md`; VandyPay sits under its `## VandyPay` block.

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh vp
bash <skill>/scripts/vandypay-login.sh vy
```

## Step 1: the statement

```bash
bash <skill>/scripts/statement.sh vy <MM> <YYYY> > stmt.json
```

It reads the Store Statement page for that month (the page takes `month` and `year` in its URL), prints every Summary figure at its statement sign plus the Adjustment Details notes, and saves the PDF beside the run as `Cookshop-11759-<YYYY>-<MM>.pdf`, the name the August entry carried. Check `sales + refunds + adjustmentsTotal = net` before going on.

## Step 2: the entry

List every entry numbered `VandyPay Fees` through the All Transactions data source (`operator:'eq'`). The month is done when an Approved one is dated its last day. The prior month's entry is the template:

```
credit  104-07 - A/R - Vandy Pay   amount                200 - Cookshop
debit   632-02 - Delivery Fees     amount   <comment>    200 - Cookshop
```

Duplicate it onto the month end; this sets the date and number and saves, printing the new id:

```bash
bash <skills>/bowery-weekly-cash-log/scripts/duplicate.sh vp <prior id> <M/D/YYYY> "VandyPay Fees"
```

## Step 3: set the lines

The comment names the month and breaks the Adjustments Total into its nonzero parts, such as `Sep 2026 adjustments: commissions 25.13 + program fee 25.00`.

```bash
node <skill>/scripts/set-fees.js <adjustments total, positive> "<comment>" > set.js
playwright-cli -s=vp eval "$(cat set.js)"
bash <skills>/danny-coops-payroll/scripts/save.sh vp
```

`set-fees.js` returns `set 2 lines at <amount>`, or a `STOP:` when the entry holds other than the two lines above. A committed save prints `[["1","<id>"," "],["1",""]]`.

## Step 4: attach and verify

Reload the entry by id, then attach the statement PDF:

```bash
bash <skills>/danny-coops-payroll/scripts/attach.sh vp "Cookshop-11759-<YYYY>-<MM>.pdf"
```

Reload again and read the server copy with `<skills>/bowery-weekly-mgmt-fees/scripts/read-lines.js`. Done when it shows the month-end date, number `VandyPay Fees`, both lines at the Adjustments Total at `200 - Cookshop` with the comment, and the PDF listed on the entry.

Leave the entry Unapproved for the user's review unless they ask for approval; approve through `#Approve > a` then `Approve and Close`, and confirm `Approved` on the All Transactions grid. Close both sessions with `playwright-cli -s=<session> close`.

Report the Summary figures, the entry id, amount, comment, attachment, status, and any non-transaction adjustment with its ACH date.

## History

- 8/31/2026: 2.54, commissions only, Approved. Comment `transaction commissions`.
- 9/30/2026: 50.13, commissions 25.13 + program fee 25.00, approved 10/2/2026, id `a863668a-f84a-4a54-a9fd-b5867645e1cf`.

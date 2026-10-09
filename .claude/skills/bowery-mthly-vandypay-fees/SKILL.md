---
name: bowery-mthly-vandypay-fees
description: Post the monthly VandyPay Fees journal entry into Bowery Group Restaurant365 for Cookshop, clearing 104-07 A/R - Vandy Pay to 632-00 Credit Card Processing Fees at the Adjustments Total on the month's UGRYD store statement, with the statement attached. Use when asked to prepare, post, or approve the Bowery VandyPay Fees entry in R365, or to pull Cookshop's VandyPay statement, or when the monthly scheduled run starts it.
---

# Monthly VandyPay fees into the Cookshop journal entry

Cookshop sells through VandyPay at Vanderbilt University - MC. R365 books each day's VandyPay sales to `104-07 - A/R - Vandy Pay`, and VandyPay pays the day out net of its commission. Once a month this entry clears the month's VandyPay charges out of the receivable into `632-00 - Credit Card Processing Fees`. Entries through 9/30/2026 booked them to `632-02 - Delivery Fees`.

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

In an interactive run, wait for the user to confirm the month's VandyPay deposits are all in R365 before building the entry.

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
debit   632-00 - Credit Card Processing Fees   amount   <comment>    200 - Cookshop
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

`set-fees.js` recodes a template still on `632-02` to `632-00` and returns `set 2 lines at <amount>` with the fee GL, or a `STOP:` when the entry holds other than the two lines above. A committed save prints `[["1","<id>"," "],["1",""]]`.

## Step 4: attach and verify

Reload the entry by id, then attach the statement PDF:

```bash
bash <skills>/danny-coops-payroll/scripts/attach.sh vp "Cookshop-11759-<YYYY>-<MM>.pdf"
```

Reload again and read the server copy with `<skills>/bowery-weekly-mgmt-fees/scripts/read-lines.js`. Done when it shows the month-end date, number `VandyPay Fees`, both lines at the Adjustments Total at `200 - Cookshop` with the debit on `632-00`, the comment, and the PDF listed on the entry.

In an interactive run, leave the entry Unapproved for the user's review unless they ask for approval; approve through `#Approve > a` then `Approve and Close`, and confirm `Approved` on the All Transactions grid. Close both sessions with `playwright-cli -s=<session> close`.

Report the Summary figures, the entry id, amount, comment, attachment, status, and any non-transaction adjustment with its ACH date.

## Unattended run

The **Bowery VandyPay Fees** task runs `scripts/vandypay-run.ps1` daily at 6:00 AM (`scripts/register-task.ps1` sets it up, only while signed in). It exits quietly before the 4th of the month and once the month just ended has a `done.txt`, so the run lands on the 4th, or the first morning after it the PC is on. It works in `.scratch/bowery-vandypay/<YYYY-MM>` and starts this skill headless with a prompt beginning `Unattended run` naming the work directory, month, year and month end. `-Force` reruns; `-Month <yyyy-MM>` names another month.

No human answers during the run, so:

- Never ask. Use sessions `vpu` for R365 and `vyu` for VandyPay, and run every command as `cd <work directory> && ...`.
- Skip the deposit confirmation.
- An Approved entry already on the month end is a success with nothing posted: `status` `approved`, its id and amount, and `already approved` in `note`.
- A statement that fails `sales + refunds + adjustmentsTotal = net`, a zero Adjustments Total, or a `STOP:` fails the run before saving: `status` `failed`, the reason in `note`.
- Approve only once Step 4 verifies. Otherwise leave it Unapproved, set `status` to `posted-unapproved`, and name each failed check in `warnings`.

Close `vpu` and `vyu`, then write `result.json` in the work directory. The wrapper posts it to Teams through `scripts/notify-teams.ps1` and reports a failure when the file is missing:

```json
{ "month": "Oct 2026", "date": "10/31/2026", "status": "approved", "amount": 50.13, "transactionId": "...",
  "comment": "Oct 2026 adjustments: commissions 25.13 + program fee 25.00", "attachment": "Cookshop-11759-2026-10.pdf",
  "programFees": [ { "amount": 25.00, "note": "Program fee - Oct 26", "achDate": "" } ], "warnings": [], "note": "" }
```

`status` is `approved`, `posted-unapproved` or `failed`. `programFees` lists each non-transaction adjustment from the Adjustment Details, so its ACH gets coded to `104-07`. The webhook lives in `~/.claude/bowery-vandypay.json`, outside the repo, in the same shape as `bowery-pe-tips.json`: `{"teamsWebhook": "<url>", "mention": {"name": "<name>", "email": "<work email>"}, "mentionWhen": "always"}`. `notify-teams.ps1 -DryRun` prints the card without posting.

## History

- 8/31/2026: 2.54, commissions only, Approved. Comment `transaction commissions`.
- 9/30/2026: 50.13, commissions 25.13 + program fee 25.00, approved 10/2/2026, id `a863668a-f84a-4a54-a9fd-b5867645e1cf`.
- From 10/31/2026: debit `632-00 - Credit Card Processing Fees`, per the user on 10/9/2026.

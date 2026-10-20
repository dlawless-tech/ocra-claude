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

Stripe is account `acct_1JKplFAju1EvNWw5` (Dlenadc), in a headed session `st`:

```bash
bash <skill>/scripts/stripe-login.sh st
```

It opens the session on the saved profile `~/.claude/playwright-profiles/dlena-stripe`, so a sign-in carries over to later runs, including the Tuesday task. It prints `authenticated` when the payouts page loads, or exits 2 when Stripe wants a sign-in. On the sign-in page it fills the login from the `## Stripe` block of `~/.claude/dlena-credentials.md` (outside the repo). Stripe then texts a 6-digit code; ask the human for it, or to type it into the open window. A second argument, in seconds, posts the code card to Teams and waits that long for the code. On a **review your account info** prompt, choose **Skip for Now**.

## Step 2: the unmatched Stripe lines

In R365 open Accounting > Banking > Bank activity (it opens in a second tab; the page is `/#/form/BankActivityForm/00000000-0000-0000-0000-000000000000`), select `1123 - dLena Deposits / Income 4001`, and answer **No** to the refresh warning. If Atlantic Union Bank's **Edit Credentials** dialog opens over the page, click its **Cancel**; it blocks every click, including the Deposit link. Read the Unmatched grid:

```js
() => jQuery('#BankActivityUnmatchedGrid').data('kendoGrid').dataSource.data().toJSON().filter(r => /STRIPE/.test(r.Name)).map(r => [new Date(r.Date).toLocaleDateString(), r.Amount])
```

Each line pairs with one Stripe payout of the same amount on Transactions > Payouts (`<acct>/payouts`); the payout's id is the `po_...` in its row link. A payout Stripe shows as paid, arrived in the last 14 days, with no bank line yet and not in the ledger (below), is posted ahead, dated its arrival date (see Step 3).

## Step 3: post each payout

```bash
bash <skill>/scripts/post-payout.sh dl st <po_id> <bank amount> [deposit date M/D/YYYY]
```

It checks the payout amount against the bank line, clicks **Export** on the payout's Transactions table and saves the file as `Stripe payout <YYYY-MM-DD> <amount>.csv`, builds the lines with `plan-lines.js`, clicks the bank line's **Deposit** link, keys each line through the Adjustments tab's new-row form (`add-lines.sh`), checks the Deposit Total equals the bank amount, attaches the export through **Upload File**, and clicks **Create Deposit**, which saves and approves in one step. It then reopens the saved deposit and runs `check-deposit.js`, which prints `MATCH Bank Deposit - BD000xxx <amount>` only when the date, every line, the Approved status and the attachment all agree. Each failure message says whether the deposit was created; one that was not leaves the bank line unmatched, so close the deposit window and rerun.

The deposit takes the bank line's date, which R365 prefills. At month end, date it by when Stripe collected the charges instead (the `Created` column of the export): stop and confirm the date with the human for any payout that crosses a month, then pass the agreed date as the fifth argument. The export file keeps the bank date in its name.

A paid payout whose bank line has not landed yet is posted ahead: pass its amount and its arrival date, and the script builds a standalone deposit on a blank `BankDepositForm` (it opens on 1123 and 10200), keys the same lines, attaches the export, and saves through the ribbon's **Approve** > **Approve**. R365 matches the bank line to it on its own when bank activity downloads.

Every `MATCH` appends `<po_id> <date> <amount> <BD number>` (tab-separated) to the ledger `.scratch/dlena-stripe-deposits/posted.tsv`, and the script stops with `STOP: ... already posted` on a payout already in it, so a payout posted ahead is never posted twice. A Stripe line still unmatched at the amount of a ledger payout means the auto-match missed: leave it for the human.

## The lines

One adjustment line per Stripe charge, at its **gross** amount, location `10200 - d'lena`:

| Charge | Account | Comment |
|---|---|---|
| `Payment for <event> at dLeña on <M/D/YYYY>`, event on or before the deposit date | 1218 - Tripleseat Receivable | `M/D/YY <event>` |
| the same, event after the deposit date | 2440 - Banquet Deposits | `M/D/YY <event>` |
| `OpenTable Experience: ... Reservation date HH:MM YYYY-Mon-DD` | 1218 or 2440 by reservation date | `M/D/YY OpenTable` |
| `OpenTable No-Show: ...`, all in the payout added into one line | 4915 - Cancellation Fee Income | `OpenTable NoShows` |
| a Refund row | the account its charge would take, by the same event date | the charge's comment, at the negative amount |
| a `Chargeback withdrawal` or `Chargeback reversal` adjustment, at its amount (the 15.00 dispute fee sits in its Fees column and joins the fee line) | 4560 - Refunds & Chargebacks | `Chargeback <customer>` |
| the payout's fees, plus any `Stripe Fee` rows (`Stripe processing fees`, billed separately and often weeks old), less any `Application fee refund` adjustments, as one negative line | 8110 - Credit Card Fees | blank |

The comment always carries the event's full month, day and year; the name may be shortened (`plan-lines.js` drops `LLC` and `Inc`). A payout with several charges for one event keeps one line per charge, and a refund of one of them stays its own negative line. `plan-lines.js` stops with `STOP:` on any row it cannot place: an adjustment other than a fee refund or chargeback, any other row type, or a description outside these patterns. Place those with the human and key the deposit by hand; nothing is created before that stop.

The new-row Amount box runs a calculator that swallows a typed minus and keeps the remaining balance, so `add-lines.sh` sets a negative amount on the form's model (`gridOptions.bankDepositDetailsGrid.newRowForm.model.amount`) and reads it back before **Add**. A fee line that happens to equal the remaining balance hides this; the read-back catches it.

## Finish

Every run ends by closing its R365 window after the last `MATCH` or after a stop. Leave the Stripe window open and signed in, for the next skill to use. Run it from the run's working directory, since sessions bind to it:

```bash
playwright-cli -s=dl close
playwright-cli list    # dl gone, st still open
```

Other skills run their own sessions on the same machine, so never use `kill-all` or `close-all`.

## Unattended run

`scripts/tuesday-run.ps1` runs from Task Scheduler on Tuesdays at 9:00 (`scripts/register-task.ps1` sets it up), while Tricia is available for the code. In the work directory, `.scratch/dlena-stripe-deposits/run<MMdd>`, it first runs `stripe-login.sh stu 1800`: the code card tags Tricia in the dLena Bank Activity channel and the run waits 30 minutes for her to type the code. With no code it posts a waiting card and stops, leaving `stu` open. Once signed in it starts this skill headless with a prompt beginning `Unattended run` that names the work directory, and marks the day done with `done.txt`: `-Force` reruns it, and `-Date yyyy-MM-dd` stands in for today.

No human answers during the run, so:

- `cd` into the work directory once and run every command from there. `stu` is already signed in to Stripe; log R365 in as `dlu`.
- Never ask. Post each unmatched Stripe line from its bank line, dated the bank date. Then post ahead every payout Stripe shows as paid, arrived in the last 14 days, with no bank line and not in the ledger, dated its arrival date; record its `bankDate` as that arrival date. Skip, with the reason, any payout that would need the human: one whose charges were collected in an earlier month than its date, an unmatched line at the amount of a ledger payout, or a `STOP:` from `post-payout.sh`. A `FAIL:` before the save is retried once after closing the deposit window; a second failure is `failed`.

Finish by closing `dlu` by name, leaving `stu` open and signed in, then write `result.json`:

```json
{ "note": "",
  "payouts": [ { "payout": "po_...", "bankDate": "10/5/2026", "amount": 995.55, "status": "posted", "deposit": "BD000382", "reason": "" } ] }
```

`status` is `posted` (a `MATCH`), `skipped` or `failed`. `scripts/notify-teams.ps1` posts the result to the dLena Bank Activity channel through the webhook in `~/.claude/dlena-stripe-deposits.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "Tricia LaRoche", "email": "tricia@ocra-us.com"}}`. Tricia is tagged on the code card and on any result that needs her: `NEEDS REVIEW` when any payout was skipped or failed or the note is set, and every `FAILED` or waiting card. A clean result posts untagged.

After a result is posted, `tuesday-run.ps1` hands off to the dLena weekly event deposit recon for the week through last Sunday (`../dlena-weekly-event-deposit-recon/scripts/weekly-run.ps1`, its **Unattended run** section). The handoff waits when any payout with a bank date through that Sunday was skipped or failed: it posts a `held` card tagging Tricia and stops. The recon posts its own card, tagging Tricia whether it tied or not, as the run's confirmation.

## Runs

9/28/2026, from the 9/16 payout BD000355 as the pattern. Posted BD000369 (9/21, $15,919.86), BD000370 (9/22, $651.36), BD000371 (9/23, $9,198.29), BD000373 (9/24, $15,179.82, two refunds and two fee refunds) and BD000372 (9/25, $2,333.92), each a `MATCH`.

10/2/2026: BD000376 (9/28, $995.55), BD000377 (9/29, $1,926.64), BD000378 (9/30, $9,437.37), BD000379 (10/1 bank line dated 9/30, $2,023.14, the first with `Stripe Fee` rows) and BD000381 (the 10/2 payout posted ahead, dated 9/30, $13,723.34), each a `MATCH`.

10/20/2026: Tuesday run posted BD000402-404 (10/13-10/15) and stopped on the 10/16 chargeback. By hand: BD000405 (10/16, $13,541.90, the first chargeback, to 4560), then BD000406 (10/19, $6,204.74) and BD000407 (10/20, $13,181.38) posted ahead of their bank lines, each a `MATCH`. The ledger was seeded from these and the 10/13 run.

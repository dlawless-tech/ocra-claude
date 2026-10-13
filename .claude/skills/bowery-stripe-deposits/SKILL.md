---
name: bowery-stripe-deposits
description: Record Shuka's Stripe (Resy) payouts in Bowery Group Restaurant365 as Bank Deposits on 100-03 Cash - Shuka Op / Payroll (2636), one per payout, splitting the reservation charges to 104-09 A/R - Resy and the card fees to 632-00 from the payout's Stripe export, with the export attached. Use when asked to post, match, or record Bowery or Shuka Stripe deposits or payouts in R365, or to check a Shuka Stripe deposit against Stripe, or when the Monday scheduled run starts it.
---

# Shuka Stripe payouts into Bowery Bank Deposits

Resy collects Shuka's reservation prepayments through the Stripe account **Shukanewyork (Resy)**, `acct_1MgBLnIS5DK8HsZn`, the only account on this login. It pays out to Chase ending 2636, and each payout lands on R365's Bank Activity page as an unmatched `Transfer from Stripe` credit on `100-03 - Cash - Shuka Op / Payroll (2636)`. Each one becomes a Bank Deposit created from that bank line, its Adjustments tab split from the payout's Stripe export, with the export attached.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for R365's iframes and silent failures, and [`../bowery-bank-downloads/SKILL.md`](../bowery-bank-downloads/SKILL.md) under **The page's quirks** for the Bank Activity account dropdown and the refresh warning. Work in one directory for the whole run, since `playwright-cli` binds sessions to it.

## Step 1: log in

Credentials are in `~/.claude/bowery-credentials.md`, under R365 and Stripe.

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh bsd
bash <skill>/scripts/stripe-login.sh bst
```

`stripe-login.sh` opens the session on the saved profile `~/.claude/playwright-profiles/bowery-stripe` and fills the email and password. It prints `authenticated`, or exits 2 with `CODE:` when Stripe texts a 6-digit code to the phone ending 3281: ask the human for it, or to type it into the open window. Given a wait in seconds as a second argument, it instead posts the code card to Teams tagging Tricia and waits that long for the code.

## Step 2: the unmatched Stripe lines

Open Bank Activity with `bash <skills>/bowery-bank-downloads/scripts/open-bank-activity.sh bsd`. Click `[aria-controls=bankActivityBankAcounts_listbox]` until the list shows, click `#bankActivityBankAcounts_listbox li >> nth=0` (100-03), and answer **No** to the refresh warning through `.r365-confirmation-popup-window button[data-testid=cancelText]`. Keep Bank Activity as the session's only tab: `post-payout.sh` returns to tab 0 when it finishes. Read the Unmatched grid:

```js
() => jQuery('#BankActivityUnmatchedGrid').data('kendoGrid').dataSource.data().toJSON().filter(r => /STRIPE/i.test(r.Name)).map(r => [new Date(r.Date).toLocaleDateString(), r.Amount])
```

List the paid payouts at `https://dashboard.stripe.com/acct_1MgBLnIS5DK8HsZn/payouts?status=paid`. Each row links to its payout, and the payout's id is the `po_...` in that link:

```js
() => [...document.querySelectorAll('tr')].map(t => { const a = t.querySelector('a[href*="po_"]'); return a && a.getAttribute('href').split('/').pop() + ' ' + t.innerText.replace(/\s+/g, ' ').trim(); }).filter(Boolean)
```

Pair each bank line with the payout of the same amount; the bank date has matched Stripe's arrival date so far. A payout Stripe shows as paid that has no bank line yet is not ready; leave it for the next run.

## Step 3: post each payout

```bash
bash <skill>/scripts/post-payout.sh bsd bst <po_id> <bank amount> <bank date M/D/YYYY>
```

It checks the payout amount against the bank line and that it paid to 2636, clicks **Export** on the payout's Transactions table and saves the file as `M.D Shuka Stripe transfers.csv` from the bank date, builds the lines with `scripts/plan-lines.js`, clicks the bank line's **Deposit** link, and keys each line with the NORMS skill's `add-lines.sh`. It then checks the Deposit Total equals the bank amount, attaches the export through **Upload File**, and clicks **Create Deposit**, which saves and approves in one step. Last, it reopens the saved deposit and prints `MATCH Bank Deposit - BD000xxx <amount>` only when the date, every line with its location, the Approved status and the attachment all agree. Each failure message says whether the deposit was created. A failure that did not create one leaves the bank line unmatched: close the deposit window (`jQuery(w).find('.k-window-content').data('kendoWindow').close()`) and rerun.

The deposit takes the bank line's date and its `Transfer from Stripe` comment, both prefilled. Stop and confirm the date with the human for any payout whose charges were collected in an earlier month than the bank date.

## The lines

All at location `400 - Shuka`:

| Line | Account | Amount | Comment |
|---|---|---|---|
| every `Charge` added together | 104-09 - A/R - Resy | gross | reservation dates, `10/22/26 reservations` |
| every `Refund` added together | 104-09 - A/R - Resy | negative | refunded reservation dates, `10/22/26 refunds` |
| the charges' fees plus each `Stripe Fee` row's Net (Radar fee and its own fee) | 632-00 - Credit Card Processing Fees | negative | `fees` |

The reservation date comes from each charge's description, `<guest> - 2026-10-22 20:45:00 - reservation`; several dates join as `10/22/26, 10/24/26 reservations`. `plan-lines.js` stops with `STOP:` on any other row, such as an adjustment, a dispute, or a charge that is not a reservation. Place those with the human and key the deposit by hand; nothing is created before that stop.

The template is BD000477 (10/8/2026, 604.63), keyed by hand. BD000479 (10/7/2026) set the refunds line, confirmed by the user. It also carried 9/30 charges and a 9/30 refund, and the user kept it dated the bank date. That ruling was for that one payout; still confirm a cross-month payout each time.

## Unattended run

`scripts/monday-run.ps1` runs from Task Scheduler on Mondays at 15:00 (`scripts/register-task.ps1` sets it up), while Tricia is available for the code. In the work directory, `.scratch/bowery-stripe-deposits/run<MMdd>`, it first runs `stripe-login.sh bstu 1800`: the code card tags Tricia in the Bowery Bank Activity channel and the run waits 30 minutes for her to type the code. With no code it posts a waiting card and stops, leaving `bstu` open. Once signed in it starts this skill headless with a prompt beginning `Unattended run` that names the work directory, and marks the day done with `done.txt`: `-Force` reruns it, and `-Date yyyy-MM-dd` stands in for today.

No human answers during the run, so:

- `cd` into the work directory once and run every command from there. `bstu` is already signed in to Stripe; log R365 in as `bsdu`.
- Never ask. Post each unmatched Stripe line from its bank line, dated the bank date. Skip, with the reason, any payout that would need the human: one whose charges were collected in an earlier month than the bank date, or a `STOP:` from `post-payout.sh`. A `FAIL:` that did not create the deposit is retried once after closing the deposit window; a second failure is `failed`.
- List every payout Stripe shows as paid with no bank line yet under `waiting`.

Finish by closing `bsdu` and `bstu` by name, then write `result.json`:

```json
{ "note": "",
  "payouts": [ { "payout": "po_...", "bankDate": "10/9/2026", "amount": 1578.40, "status": "posted", "deposit": "BD000478", "reason": "" } ],
  "waiting": [ { "payout": "po_...", "arrival": "10/13/2026", "amount": 99.94 } ] }
```

`status` is `posted` (a `MATCH`), `skipped` or `failed`. `scripts/notify-teams.ps1` posts it to the Bowery Bank Activity channel through `~/.claude/bowery-stripe-deposits.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "Brandy Sanders", "email": "<work email>"}, "codeMention": {"name": "Tricia LaRoche", "email": "<work email>"}}`. Brandy is tagged on every result card, marked `NEEDS REVIEW` when any payout was skipped or failed or the note is set. `-Code` tags Tricia for the sign-in code instead.

## First run

10/12/2026. `plan-lines.js` rebuilt BD000477 line for line from its export before anything was posted. Posted BD000478 (10/9, 1,578.40) and BD000479 (10/7, 12,145.55, with 1,391.90 of refunds), each a `MATCH`.

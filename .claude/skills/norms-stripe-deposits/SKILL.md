---
name: norms-stripe-deposits
description: Record NORMS's Stripe payouts in Restaurant365 as Bank Deposits on 1020 Norms Operating - 0829, one per payout, from the payout's Stripe export. Gift card payouts split into Gift Card Liability and processing fees; In Kind tip payouts split per store into In Kind Liability and card fees. Use when asked to post, match, or record NORMS Stripe deposits or payouts in R365, or to check a NORMS Stripe deposit against Stripe.
---

# NORMS Stripe payouts into R365 Bank Deposits

Two Stripe accounts pay out to the Wells Fargo account ending 0829, and each payout lands on R365's Bank Activity page as an unmatched `STRIPE TRANSFER ST-xxxx NORMS RESTAURANTS LLC` credit on `1020 - Norms Operating - 0829`. Each one becomes a Bank Deposit created from that bank line, its Adjustments tab split from the payout's Stripe export, with the export attached.

| Stream | Stripe account | Charges |
|---|---|---|
| `gc` | Norms gift cards, `acct_1IVMd4Icg0NAKHmc` | `Norms Order` gift card sales |
| `inkind` | Norms In Kind Tips, `acct_1R6e5CRrbOF3zRps` | `INKD Gratuity NORMS Restaurant (<store #>)` tips |

The bank line's text is the same for both, so tell them apart by amount: each line matches one paid payout in exactly one of the two accounts.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) for R365's iframes and silent failures, and [`../bowery-bank-downloads/SKILL.md`](../bowery-bank-downloads/SKILL.md) under **The page's quirks** for the Bank Activity account dropdown and the refresh warning. Work in one directory for the whole run, since `playwright-cli` binds sessions to it.

## Step 1: log in

Credentials are in `~/.claude/norms-credentials.md`, under R365 and Stripe.

```bash
bash <skills>/norms-ubereats/scripts/r365-login.sh ns
bash <skill>/scripts/stripe-login.sh st
```

`stripe-login.sh` opens the session on the saved profile `~/.claude/playwright-profiles/norms-stripe` and fills the email and password. It prints `authenticated`, or exits 2 with `CODE:` when Stripe texts a 6-digit code to the phone ending 3281: ask the human for it, or to type it into the open window. Given a wait in seconds as a second argument, it instead posts the code card to Teams tagging Tricia and waits that long for the code. Stripe sign-ins do not last a week, so expect the code every run. The two accounts switch under the account button at the top left (**Account options and switcher**). The two accounts switch under the account button at the top left (**Account options and switcher**). A payout URL carrying the account id also works directly.

## Step 2: the unmatched Stripe lines

In R365 reach Bank Activity (`goto https://norms.restaurant365.com/#/form/BankActivityForm/00000000-0000-0000-0000-000000000000` holds the session). Select `1020 - Norms Operating - 0829`, the second entry in `#bankActivityBankAcounts_listbox li`, and answer **No** to the refresh warning if it shows. Setting the combo box from script does not load the grid; click its **select** button, then the `option "1020 - Norms Operating - 0829"` from a snapshot. Keep Bank Activity as the session's only tab: `post-payout.sh` returns to tab 0 when it finishes. Read the Unmatched grid:

```js
() => jQuery('#BankActivityUnmatchedGrid').data('kendoGrid').dataSource.data().toJSON().filter(r => /STRIPE/.test(r.Name)).map(r => [new Date(r.Date).toLocaleDateString(), r.Amount])
```

List each account's paid payouts at `<acct>/payouts?status=paid`. The plain `/payouts` view answers **Unable to load this view** for this login. Each row links to its payout, and the payout's id is the `po_...` in that link:

```js
() => [...document.querySelectorAll('tr')].map(t => { const a = t.querySelector('a[href*="po_"]'); return a && a.getAttribute('href').split('/').pop() + ' ' + t.innerText.replace(/\s+/g, ' ').trim(); }).filter(Boolean)
```

A payout Stripe shows as paid that has no bank line yet is not ready; leave it for the next run.

## Step 3: post each payout

```bash
bash <skill>/scripts/post-payout.sh ns st <gc|inkind> <po_id> <bank amount> <bank date M/D/YYYY>
```

Always pass the bank date. Gift card payouts often repeat an amount (19.10 on both 10/7 and 10/9/2026), and without it two unmatched lines at one amount stop the script.

It checks the payout amount against the bank line, clicks **Export** on the payout's Transactions table and saves the file as `MM.DD GC Stripe Transfer.csv` or `MM.DD In Kind Stripe Transfer.csv`, builds the lines with `plan-lines.js`, clicks the bank line's **Deposit** link, and keys each line through the Adjustments tab's new-row form (`add-lines.sh`). It then compares the grid to the plan, checks the Deposit Total equals the bank amount, attaches the export through **Upload File**, and clicks **Create Deposit**, which saves and approves in one step. Last, it reopens the saved deposit and runs `check-deposit.js`, which prints `MATCH Bank Deposit - BD00xxxxx <amount>` only when the date, every line with its location, the Approved status and the attachment all agree. Each failure message says whether the deposit was created. A failure that did not create one leaves the bank line unmatched: close the deposit window (`jQuery(w).find('.k-window-content').data('kendoWindow').close()`, since it has no labeled close button) and rerun.

Stripe's Export sometimes stalls on **Applying finishing touches to your export**, most often on the first payout after switching accounts. `post-payout.sh` cancels it, reloads the payout, and tries once more.

Keying runs about 20 seconds a line, so a 23-store In Kind payout (46 lines) takes over 10 minutes. Run it in the background rather than inside a 10-minute tool timeout.

The deposit takes the bank line's date, which R365 prefills. At month end, date it by when Stripe collected the payout instead; stop and confirm the date with the human for any payout that crosses a month.

## The lines

**Gift cards**, location `299 - Norms Support Center`, comments blank:

| Line | Account | Amount |
|---|---|---|
| every `Charge` added together | 2220 - Gift Card Liability | gross |
| the charges' fees plus every `Stripe Fee` row (Radar), as one line | 6665 - Gift Card Processing | negative |

**In Kind tips**, one pair per store, at that store's location. The store number is the `(NNN)` in the charge description and is R365's location number (`243` is `243 - Santa Ana`):

| Line | Account | Amount | Comment |
|---|---|---|---|
| the store's charges added together | 2223 - In Kind Liability | gross | `In Kind Tips` |
| the store's fees | 5510 - Credit Card Fees | negative | `In Kind Fees` |

`plan-lines.js` stops with `STOP:` on any row it cannot place: a refund, an adjustment, or a description outside these patterns. Place those with the human and key the deposit by hand; nothing is created before that stop. The one precedent is BD006540 (8/10/2026), which put two negative In Kind adjustments on `1093 - Cash in Bank-inKind Suspense` at 299 with comment `Adjustment`.

Before 8/10/2026 the In Kind tips went to 5910 Cash over Short. Older deposits also show a few one-off slips (a tips line on 2220 or 5510, a tab in a comment); follow the tables here.

The new-row Amount box runs a calculator that swallows a typed minus and keeps the remaining balance, so `add-lines.sh` sets a negative amount on the form's model (`gridOptions.bankDepositDetailsGrid.newRowForm.model.amount`) and reads it back before **Add**. Location works the same way. The model holds a location id, defaulting to 299, and `add-lines.sh` looks the id up by `locationNumber` in `#newRowLocationInput`'s data and sets it on `model.location`. Read that box by id. The account box and the bank account boxes also carry a `locationNumber` field, so a search for any list with that field lands on the wrong one.

## Unattended run

`scripts/monday-run.ps1` runs from Task Scheduler on Mondays at 16:00 (`scripts/register-task.ps1` sets it up), while Tricia is available for the code. In the work directory, `.scratch/norms-stripe-deposits/run<MMdd>`, it first runs `stripe-login.sh stu 1800`: the code card tags Tricia in the NORMS Bank Activity channel and the run waits 30 minutes for her to type the code. With no code it posts a waiting card and stops, leaving `stu` open. Once signed in it starts this skill headless with a prompt beginning `Unattended run` that names the work directory, and marks the day done with `done.txt`: `-Force` reruns it, and `-Date yyyy-MM-dd` stands in for today.

No human answers during the run, so:

- `cd` into the work directory once and run every command from there. `stu` is already signed in to Stripe; log R365 in as `nsu`.
- Never ask. Post each unmatched Stripe line from its bank line, dated the bank date. Skip, with the reason, any payout that would need the human: one whose charges were collected in an earlier month than the bank date, or a `STOP:` from `post-payout.sh`. A `FAIL:` that did not create the deposit is retried once after closing the deposit window; a second failure is `failed`.
- List every payout Stripe shows as paid with no bank line yet under `waiting`.

Finish by closing `nsu` and `stu` by name, then write `result.json`:

```json
{ "note": "",
  "payouts": [ { "stream": "inkind", "payout": "po_...", "bankDate": "10/6/2026", "amount": 134.29, "status": "posted", "deposit": "BD010790", "reason": "" } ],
  "waiting": [ { "payout": "po_...", "arrival": "10/13/2026", "amount": 99.94 } ] }
```

`status` is `posted` (a `MATCH`), `skipped` or `failed`. `scripts/notify-teams.ps1` posts it to the NORMS Bank Activity channel through `~/.claude/norms-stripe-deposits.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "Regina Leong", "email": "rleong@ocra-us.com"}, "codeMention": {"name": "Tricia LaRoche", "email": "tricia@ocra-us.com"}}`. Regina is tagged on every result card, marked `NEEDS REVIEW` when any payout was skipped or failed or the note is set. `-Code` tags Tricia for the sign-in code instead.

## First run

9/28/2026. The rules come from 69 of the 103 Stripe deposits posted 6/15 to 9/18/2026, read back from R365. BD009444 (9/17 gift card, $48.23) and BD009449 (9/18 In Kind, $86.49, 14 stores) were rebuilt line for line from their Stripe exports before anything was posted. Posted BD010070 (9/21 In Kind, $111.64), BD010071 (9/22 gift card, $48.21), BD010072 (9/22 In Kind, $90.62), BD010073 (9/23 In Kind, $676.61, 46 lines), BD010074 (9/24 In Kind, $89.60), BD010075 (9/25 gift card, $46.68) and BD010076 (9/25 In Kind, $94.58), each a `MATCH`.

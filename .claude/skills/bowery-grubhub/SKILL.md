---
name: bowery-grubhub
description: Reconcile Grubhub deposits into the matching Bowery Group Restaurant365 journal entries, for one store or for all four in a batch. Use when asked to post or balance a Bowery Grubhub deposit in R365, to pull a Bowery store's Grubhub period figures, or to check the Bowery A/R Grub Hub balance against a deposit.
---

# Grubhub deposit into a Bowery journal entry

Two phases. **Gather** every figure first, from Grubhub and from one GL report, then **post** the entries. Both phases read in bulk, so a four store run costs about the same reading as a single store.

Sessions:

```bash
playwright-cli -s=bgh open --headed https://restaurant.grubhub.com/login                    # Grubhub
playwright-cli -s=bj open --headed https://bowerygroup.restaurant365.com/react/accounting   # journal entries
playwright-cli -s=bb open --headed https://bowerygroup.restaurant365.com/react/accounting   # GL report
```

`playwright-cli` binds sessions to the working directory. Stay in one directory for a whole run, and never `cd` mid run or the sessions vanish.

The NORMS skills use the default session plus `r365` and `r365b` in the same directory, and a NORMS run may still hold them open. Run `playwright-cli list` first and use the Bowery names above, so this run never navigates or logs out another company's browser. Close only the Bowery sessions when the run ends.

Keep working files in a per-run folder such as `.scratch/bgh<MMDD>/`.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting any of this. R365 is a legacy Angular app whose grids and report dialogs ignore scripted input and fail silently, and every rule in that file was paid for with a wrong or empty entry. It is shared with the `bowery-ubereats` skill, so fix R365 platform behavior there once rather than in two places.

## The period

Bowery's Grubhub period runs **Tuesday to Monday**, so September's first period is 9/1 through 9/7. The journal entry is dated the **Sunday inside the period**, 9/6 for that one, and the GL report window is the period itself, 9/1 through 9/7.

The Uber Eats period is Monday to Sunday and its entry is dated the Sunday that ends the period. Carrying that habit here dates the entry 9/7 and reads a window one day off.

## Logins

Credentials live in `~/.claude/bowery-credentials.md`, outside any repo. Read them from there rather than asking the human. Missing or rejected credentials are the one case worth asking about.

Grubhub takes email and password at `restaurant.grubhub.com/login`. If it challenges with a mailed code, hand the keyboard over and say so. One Grubhub session serves the whole run.

R365 posts a username and password form at `identity.restaurant365.com`. `scripts/r365-login.sh <session>` logs in and is safe to re-run. Reach pages by clicking the home dashboard nav, since opening a `/react/...` URL drops the session; `R365-AUTOMATION.md` carries the detail.

## The four stores

R365 locations: `200 - Cookshop`, `500 - Rosie's`, `Shuka`, `Vic's`.

R365 writes Rosie's and Vic's with a curly apostrophe. Match locations on an ASCII fragment (`Rosie`, `Vic`) so shell quoting never has to carry the character.

Grubhub's picker names each store by street: `Cookshop - 10th Ave`, `Rosie's - E 2nd St`, `Shuka - MacDougal St`, `Vic's - Great Jones St`. A store with no deposit for the period is a real outcome: report it and post nothing for it.

## Phase 1: the Grubhub figures

Once logged in, **read the figures from the API the Deposit history page itself calls**, through `eval` in the Grubhub session. Two calls cover all four stores, with no clicking:

```js
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const rests = JSON.parse(localStorage.getItem('associatedRestaurants'));   // id, name, streetAddress
const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';

// every deposit for all four stores; the window filters on the date PAID
await fetch(base + rests.map(r => r.id).join(',') + '/deposits/summary?startTime=2026-09-08T00:00:00.000Z&endTime=2026-09-25T06:59:59.000Z', {headers: H});
// one deposit in full
await fetch(base + restId + '/deposits/' + dep.restaurant_distribution_id, {headers: H});
```

The window filters on the date each deposit was **paid**, so run it from a week before the period to a day past today. A Tuesday to Monday period settles on the Wednesday after it (9/15 to 9/21 paid 9/23). The summary call returns empty `totals`, so the per deposit call is what carries the figures, in cents and signed as Grubhub shows them:

| Field | Use |
|---|---|
| `total` (on the deposit) | net deposit |
| `totals.prepaid_total` | gross sales, checks the arithmetic |
| `totals.commission_total` | commissions |
| `totals.grubhub_delivery_fee_total` | delivery commissions |
| `totals.processing_fee` | order processing fees |
| `totals.account_adj` | Grubhub credits or debits outside any order |

Grubhub shows fees as negatives and they enter R365 as positive debits. The R365 template carries one line for each fee, so keep them apart rather than summing them. Per store, record the deposit's `short_distribution_id`, its net, and the three fees.

Pick the deposit by the sales dates it covers. `associated_transactions` carries a `transaction_time` per order in UTC, so convert to `America/New_York` before bucketing by day. If a single period settles as more than one deposit for a store, sum the net deposits, sum each fee line separately, and note both IDs.

Check each store before moving on: `prepaid_total` plus every signed field in `totals` equals `total`. With `account_adj` at zero this is gross minus the three fees and closes to the penny. A nonzero `account_adj` comes from a `CS_CREDIT` row labelled "Account Adjustment" in `associated_transactions`. No journal line models it, so it lands in the difference line. Record its order number for the report.

The UI path, **Financials > Deposit history** then click each deposit ID, is the fallback if the API refuses. There only real `playwright-cli click`s register, and Back must be clicked before opening the next deposit.

## Phase 2: the period debits

The daily journal entries debit `104-06 - A/R - Grub Hub` with each day's third party sales including tax. The period's debits, call this **D**, are what the entry clears.

Reports > My reports in `bb`. Run **GL Account Detail** through Customize with account `104-06 - A/R - Grub Hub`, Start 9/1 and End 9/7, the location filter on all locations, and **Subtotal By** set to **Location**. Read each location's `Total A/R - Grub Hub` **Debit** figure, which is that store's D.

The window is the period because Subtotal By groups only when the window holds detail rows. A window after the period holds none, so the report collapses to one ungrouped total.

Each location's block also shows a beginning balance and a Bank Deposit line clearing it. That pair confirms the prior period's deposit landed; a missing deposit is worth reporting before posting.

## The arithmetic

The entry carries five lines, keyed by the comment R365 already holds on each template line. The a/r line says "payout" where Grubhub says deposit, so copy the comments verbatim:

```
credit "a/r debit from prior week less total payout"  =  D - net deposit
debit  "commissions"                                  =  Commissions
debit  "delivery commissions"                         =  Delivery Commissions
debit  "order processing fees"                        =  Order Processing Fees
       "difference"                                   =  (D - net deposit) - the three fees
                                                         debit if positive, credit if negative
```

The difference is the balancing plug, and it and the three fee lines all post to `632-02 - Delivery Fees`. It absorbs the gap between what R365 booked as third party sales and what Grubhub settled, which runs to a few cents in a typical period. A figure in dollars rather than cents is worth understanding before approving.

To explain a dollar difference, bucket each deposit's `prepaid_amount` by New York day and set it beside the store's daily Journal Entry debits in the GL report. Three causes have turned up:

- **Refunds.** `PCI_SINGLE_REFUND` rows reduce Grubhub's gross, and R365 still carries the original sale.
- **Account adjustments.** A `CS_CREDIT` raises the net deposit with no sale behind it, pushing the difference toward a credit.
- **A day R365 overbooks.** R365's daily sales exceed Grubhub's orders for that day, usually an order Grubhub cancelled or has not settled yet. An unsettled order reverses in the next period.

Name the cause and amount per store in the report. Post with the plug, since the A/R balance still ties to the net deposit.

**Do not use the account's beginning balance for the credit.** Beginning balance equals D only while the prior period's deposit has already been booked. Deposits lag by several days and sometimes miss a period, and when one is outstanding the beginning balance carries it, pushing the whole undeposited receivable into the difference line and expensing it to Delivery Fees.

**Check the resulting A/R balance instead.** After the credit posts, the account's balance for that location should equal the net deposit, which is the receivable awaiting settlement. This confirms the formula in one subtraction and works even in a period with no prior entry to compare against.

## Finding the entries

Bowery carries one Grubhub entry per period, dated the Sunday inside it, so the period Sep 1 - Sep 7 posts to the entry dated Sep 6.

Accounting > Transactions > All transactions, reached through the home dashboard's collapsed side menu (`R365-AUTOMATION.md` has the clicks). Filter Number (`Contains`) to `Grub`, which catches both `GrubHub` and `Grub Hub`, then harvest every entry and its id from the grid's data source in one call rather than clicking through rows. `R365-AUTOMATION.md` carries the call and the direct entry URL it feeds.

Each entry arrives as a template: five lines carrying accounts, comments, and location, every amount at 0.00. **Read the comments off the first entry you open and use them verbatim** for the rest of the run, since the posting script keys every line by its comment text. Templates get reshaped between periods, so an entry from an earlier period is worth checking rather than trusting.

## Posting

Fill the five lines, save, reload, then Approve and Close. Three checks decide whether an entry is right, and skipping any of them is how empty and unbalanced entries reach Approved:

1. **Read back every amount** from its cell after typing it. Compare numerically, since R365 renders `4` as `4.00`.
2. **Sum the lines before saving** and match both sides against the expected total. Sum the named rows only, because the footer row would double the count.
3. **Reload after saving**, and confirm the values survived. A save that never reached the server leaves every line at 0.00, and approving then commits an empty entry.

`scripts/post-entry.sh` does all of this for one store and refuses to approve anything that fails a check:

```bash
ENTRY_DATE=9/6/2026 scripts/post-entry.sh bj Cookshop work.json
```

Run stores in parallel by giving each worker its own session name. See `scripts/work.example.json` for the work file's shape, which carries each line's comment text alongside its amount.

If the automated save will not land after a retry, re-enter the amounts, tell the human, and let them click Save, Approve, and Close.

## Verifying the run

Refilter the All Transactions grid and read every row back from the grid's data source, checking status is **Approved** and the amount matches the planned total for that store. Verify from the grid rather than from what the posting step reported, since a worker reports what it believes and the grid reports what R365 holds.

Report the table of stores, deposit IDs, amounts, and totals, and report any store that failed just as plainly.

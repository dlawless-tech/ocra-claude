---
name: bowery-ubereats
description: Reconcile Uber Eats payouts into the matching Bowery Group Restaurant365 journal entries, for one store or for all four in a batch. Use when asked to post or balance a Bowery Uber Eats payout in R365, to pull a Bowery store's Uber Eats pay period figures, or to check the Bowery A/R Uber Eats balance against a payout.
---

# Uber Eats payout into a Bowery journal entry

Two phases. **Gather** every figure first, from Uber Eats and from one GL report, then **post** the entries. Both phases read in bulk, so a four store run costs about the same reading as a single store.

Sessions:

```bash
playwright-cli open --headed https://merchants.ubereats.com/manager/                          # Uber Eats
playwright-cli -s=r365 open --headed https://bowerygroup.restaurant365.com/react/accounting   # journal entries
playwright-cli -s=r365b open --headed https://bowerygroup.restaurant365.com/react/accounting  # GL report
```

`playwright-cli` binds sessions to the working directory. Stay in one directory for a whole run, and never `cd` mid run or the sessions vanish.

Read [`R365-AUTOMATION.md`](R365-AUTOMATION.md) before scripting any of this. R365 is a legacy Angular app whose grids and report dialogs ignore scripted input and fail silently, and every rule in that file was paid for with a wrong or empty entry.

## Logins

Credentials live in `~/.claude/bowery-credentials.md`, outside any repo. Read them from there rather than asking the human. Missing or rejected credentials are the one case worth asking about.

Bowery and NORMS share one R365 login and hold separate Uber Eats logins, so reach for the Bowery credential file here.

Uber Eats mails a 4-digit code to the merchant address. Fill the email field, then hand the keyboard over for the code and say so. Never guess or wait on it. One Uber session serves the whole run, since each new session triggers another code.

R365 posts a username and password form at `identity.restaurant365.com`. Log in, then reach pages through the app menu or a known route. Guessing a hash route logs the session out.

## The four stores

| Uber Eats | R365 location |
|---|---|
| `Cookshop` | `200 - Cookshop` |
| `Rosie’s Taqueria` | `500 - Rosie’s` |
| `Shuka` | `Shuka` |
| `Vic's` | `Vic’s` |

R365 writes `Rosie’s` and `Vic’s` with a curly apostrophe. Match locations on an ASCII fragment (`Rosie`, `Vic`) so shell quoting never has to carry the character.

## Phase 1: the Uber figures

Payments > Payouts. The store picker's radio leaves the page on the old store until you click **Apply**, and switching stores resets the date range to the open period, so set the period again after every switch.

The date control opens on a **Pay period** tab. Bowery's periods run Monday to Sunday. Clicking any date selects the whole period containing it, so click a midweek date and read the range back: `Selected date range is from 08/31/2026 to 09/06/2026`.

Per store, read off the Overview tab: store name, Total Payout, and the Earnings, Uber Fees, Net Chargeback Amount and Net Taxes rows of Pay breakdown. Uber shows Uber Fees as a negative and it enters R365 as a positive debit. Net Taxes is a positive figure for these New York stores, unlike a marketplace-facilitator estate where it is zero.

Two reading traps:

- Pay breakdown drops a row that is 0.00. The **Net Chargeback Amount** card at the top of the page covers that case, and the card and the row share a label, so scope the row lookup to the Pay breakdown block.
- A stray click on the payouts page opens an order drawer that covers the date control, and the drawer often loads as "Something went wrong". Screenshot when a click stops landing, and close the drawer before retrying.

Check each store before moving on: `Earnings + Uber Fees + Net Chargeback + Net Taxes` equals `Total Payout`. A store that fails this has an unmodeled row worth finding.

## Phase 2: the period debits

The daily journal entries debit `104-04 - A/R - Uber Eats` with each day's third party sales including tax. The period's debits, call this **D**, are what the entry clears.

Reports > My reports in `r365b`. Run **GL Account Detail** through Customize with account `104-04 - A/R - Uber Eats`, Start the period's first day, End its last day, the location filter on all locations, and **Subtotal By** set to **Location**. Read each location's `Total A/R - Uber Eats` **Debit** figure, which is that store's D.

The window is the pay period because Subtotal By groups only when the window holds detail rows. A window after the period holds none, so the report collapses to one ungrouped total.

Each location's block also shows a beginning balance and a Bank Deposit line clearing it. That pair confirms the prior period's payout landed; a missing deposit is worth reporting before posting.

## The arithmetic

The entry carries three lines, keyed by comment:

```
credit on "a/r debit from prior week less total payout"  =  D - Total Payout
debit  on "uber fees"                                    =  Uber Fees shown positive
"difference"                                             =  (D - Total Payout) - Uber Fees
                                                            debit if positive, credit if negative
```

The difference is the balancing plug, and both it and the fees line post to `632-02 - Delivery Fees`. It absorbs everything the two named lines do not model, chargebacks among them, plus the genuine gap `D - Earnings - Net Taxes` between what R365 booked and what Uber settled. It lands at 0.00 for most stores in a typical week, which is a normal result to record and approve.

**Do not use the account's beginning balance for the credit.** Beginning balance equals D only while the prior period's payout has already been deposited and booked. Deposits lag by several days and sometimes miss a week, and when one is outstanding the beginning balance carries it, pushing the whole undeposited receivable into the difference line and expensing it to Delivery Fees.

**Check the resulting A/R balance instead.** After the credit posts, the account's balance for that location should equal Total Payout, which is the receivable awaiting the next deposit. This confirms the formula in one subtraction and works even in a week with no prior entry to compare against.

## Finding the entries

Bowery carries one UberEats entry per week, dated the Sunday that ends the pay period, so the period Aug 31 - Sep 6 posts to the entry dated Sep 6.

Accounting > Transactions > All transactions, route `/react/accounting/legacy/AllTransactions`. Filter Number (`Contains`) to `UberEats`, then harvest every entry and its id from the grid's data source in one call rather than clicking through rows. [`R365-AUTOMATION.md`](R365-AUTOMATION.md) carries the call and the direct entry URL it feeds.

Each entry arrives as a template: three lines carrying accounts, comments, and location, every amount at 0.00. Bowery reshaped this template in September 2026, so an entry from an earlier week is a two line reclass between `104-04` and `104-00` and reproduces none of the arithmetic above. Verify against the A/R balance rather than against an older entry.

## Posting

Fill the three lines, save, reload, then Approve and Close. Three checks decide whether an entry is right, and skipping any of them is how empty and unbalanced entries reach Approved:

1. **Read back every amount** from its cell after typing it. Compare numerically, since R365 renders `4` as `4.00`.
2. **Sum the three lines before saving** and match the total against the expected figure. Sum the three named rows only, because the footer row would double the count.
3. **Reload after saving**, and confirm the values survived. A save that never reached the server leaves every line at 0.00, and approving then commits an empty entry.

`scripts/post-entry.sh` does all of this for one store and refuses to approve anything that fails a check:

```bash
ENTRY_DATE=9/6/2026 scripts/post-entry.sh r365 Cookshop work.json
```

Run stores in parallel by giving each worker its own session name. See `scripts/work.example.json` for the work file's shape.

If the automated save will not land after a retry, re-enter the amounts, tell the human, and let them click Save, Approve, and Close.

## Verifying the run

Refilter the All Transactions grid and read every row back from the grid's data source, checking status is **Approved** and the amount matches the planned total for that store. Verify from the grid rather than from what the posting step reported, since a worker reports what it believes and the grid reports what R365 holds.

Report the table of stores, amounts, and totals, and report any store that failed just as plainly.

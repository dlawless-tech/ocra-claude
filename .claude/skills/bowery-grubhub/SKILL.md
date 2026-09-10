---
name: bowery-grubhub
description: Reconcile Grubhub deposits into the matching Bowery Group Restaurant365 journal entries, for one store or for all four in a batch. Use when asked to post or balance a Bowery Grubhub deposit in R365, to pull a Bowery store's Grubhub period figures, or to check the Bowery A/R Grub Hub balance against a deposit.
---

# Grubhub deposit into a Bowery journal entry

Two phases. **Gather** every figure first, from Grubhub and from one GL report, then **post** the entries. Both phases read in bulk, so a four store run costs about the same reading as a single store.

Sessions:

```bash
playwright-cli open --headed https://restaurant.grubhub.com/login                             # Grubhub
playwright-cli -s=r365 open --headed https://bowerygroup.restaurant365.com/react/accounting   # journal entries
playwright-cli -s=r365b open --headed https://bowerygroup.restaurant365.com/react/accounting  # GL report
```

`playwright-cli` binds sessions to the working directory. Stay in one directory for a whole run, and never `cd` mid run or the sessions vanish.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting any of this. R365 is a legacy Angular app whose grids and report dialogs ignore scripted input and fail silently, and every rule in that file was paid for with a wrong or empty entry. It is shared with the `bowery-ubereats` skill, so fix R365 platform behavior there once rather than in two places.

## The period

Bowery's Grubhub period runs **Tuesday to Monday**, so September's first period is 9/1 through 9/7. The journal entry is dated the **Sunday inside the period**, 9/6 for that one, and the GL report window is the period itself, 9/1 through 9/7.

The Uber Eats period is Monday to Sunday and its entry is dated the Sunday that ends the period. Carrying that habit here dates the entry 9/7 and reads a window one day off.

## Logins

Credentials live in `~/.claude/bowery-credentials.md`, outside any repo. Read them from there rather than asking the human. Missing or rejected credentials are the one case worth asking about.

Grubhub takes email and password at `restaurant.grubhub.com/login`. If it challenges with a mailed code, hand the keyboard over and say so. One Grubhub session serves the whole run.

R365 posts a username and password form at `identity.restaurant365.com`. Log in, then reach pages through the app menu or a known route. Guessing a hash route logs the session out. `scripts/r365-login.sh <session>` does this and is safe to re-run.

## The four stores

R365 locations: `200 - Cookshop`, `500 - Rosie's`, `Shuka`, `Vic's`.

R365 writes Rosie's and Vic's with a curly apostrophe. Match locations on an ASCII fragment (`Rosie`, `Vic`) so shell quoting never has to carry the character.

Grubhub's picker names each store by street: `Cookshop - 10th Ave`, `Rosie's - E 2nd St`, `Shuka - MacDougal St`, `Vic's - Great Jones St`. A store with no deposit for the period is a real outcome: report it and post nothing for it.

## Phase 1: the Grubhub figures

**Financials > Deposit history**, reached through the hamburger at the top left. Select all four locations and click **Apply**, then set the date range.

The range filters on the date each deposit was **paid**, so it has to cover the days after the period closes. The period 9/1 to 9/7 settled on 9/9. Set a range that runs from a week before the period to today, and read the covered sales dates off each deposit rather than trusting its row date.

Click the **deposit ID** to open the detail, which is the only place the fee breakdown appears. The history grid alone gives a net figure and no fees. Two mechanics govern this page:

- **Only real clicks register.** A scripted `click()` from `eval` silently leaves the panel on whatever deposit is already open, so every deposit reads back as a copy of the first one. Use `playwright-cli click` against a snapshot ref.
- **Click Back before opening the next deposit.** With the detail panel open, a click on another row does nothing. Resolve the Back control from a fresh snapshot each time, since it is a `generic` carrying the text `Back`.

Per store, record: the deposit ID, the sales dates it covers, the **net deposit** paid, and every fee line in the detail. Grubhub shows fees as negatives against gross sales and they enter R365 as positive debits. The three fee lines are `Commissions`, `Delivery Commissions` and `Order Processing Fees`, and the R365 template carries one line for each, so keep them apart rather than summing them.

If a single period settles as more than one deposit for a store, sum the net deposits, sum each fee line separately, and note both IDs.

Check each store before moving on: gross sales minus the three fee lines equals the Deposit Total shown on the same panel. This closes to the penny when the figures are read right.

## Phase 2: the period debits

The daily journal entries debit `104-06 - A/R - Grub Hub` with each day's third party sales including tax. The period's debits, call this **D**, are what the entry clears.

Reports > My reports in `r365b`. Run **GL Account Detail** through Customize with account `104-06 - A/R - Grub Hub`, Start 9/1 and End 9/7, the location filter on all locations, and **Subtotal By** set to **Location**. Read each location's `Total A/R - Grub Hub` **Debit** figure, which is that store's D.

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

**Do not use the account's beginning balance for the credit.** Beginning balance equals D only while the prior period's deposit has already been booked. Deposits lag by several days and sometimes miss a period, and when one is outstanding the beginning balance carries it, pushing the whole undeposited receivable into the difference line and expensing it to Delivery Fees.

**Check the resulting A/R balance instead.** After the credit posts, the account's balance for that location should equal the net deposit, which is the receivable awaiting settlement. This confirms the formula in one subtraction and works even in a period with no prior entry to compare against.

## Finding the entries

Bowery carries one Grubhub entry per period, dated the Sunday inside it, so the period Sep 1 - Sep 7 posts to the entry dated Sep 6.

Accounting > Transactions > All transactions, route `/react/accounting/legacy/AllTransactions`. Filter Number (`Contains`) to `Grub`, which catches both `GrubHub` and `Grub Hub`, then harvest every entry and its id from the grid's data source in one call rather than clicking through rows. `R365-AUTOMATION.md` carries the call and the direct entry URL it feeds.

Each entry arrives as a template: five lines carrying accounts, comments, and location, every amount at 0.00. **Read the comments off the first entry you open and use them verbatim** for the rest of the run, since the posting script keys every line by its comment text. Templates get reshaped between periods, so an entry from an earlier period is worth checking rather than trusting.

## Posting

Fill the five lines, save, reload, then Approve and Close. Three checks decide whether an entry is right, and skipping any of them is how empty and unbalanced entries reach Approved:

1. **Read back every amount** from its cell after typing it. Compare numerically, since R365 renders `4` as `4.00`.
2. **Sum the lines before saving** and match both sides against the expected total. Sum the named rows only, because the footer row would double the count.
3. **Reload after saving**, and confirm the values survived. A save that never reached the server leaves every line at 0.00, and approving then commits an empty entry.

`scripts/post-entry.sh` does all of this for one store and refuses to approve anything that fails a check:

```bash
ENTRY_DATE=9/6/2026 scripts/post-entry.sh r365 Cookshop work.json
```

Run stores in parallel by giving each worker its own session name. See `scripts/work.example.json` for the work file's shape, which carries each line's comment text alongside its amount.

If the automated save will not land after a retry, re-enter the amounts, tell the human, and let them click Save, Approve, and Close.

## Verifying the run

Refilter the All Transactions grid and read every row back from the grid's data source, checking status is **Approved** and the amount matches the planned total for that store. Verify from the grid rather than from what the posting step reported, since a worker reports what it believes and the grid reports what R365 holds.

Report the table of stores, deposit IDs, amounts, and totals, and report any store that failed just as plainly.

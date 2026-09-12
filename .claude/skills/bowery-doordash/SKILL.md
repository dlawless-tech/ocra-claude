---
name: bowery-doordash
description: Reconcile DoorDash payouts into the matching Bowery Group Restaurant365 journal entries, for one store or for all four in a batch. Use when asked to post or balance a Bowery DoorDash payout in R365, to pull a Bowery store's DoorDash payout figures, or to check the Bowery A/R Door Dash balance against a payout.
---

# DoorDash payout into a Bowery journal entry

Two phases. **Gather** every figure first, from DoorDash and from one GL report, then **post** the entries. Both phases read in bulk, so a four store run costs about the same reading as a single store.

Sessions:

```bash
playwright-cli open --headed https://www.doordash.com/merchant/login                           # DoorDash
playwright-cli -s=r365 open --headed https://bowerygroup.restaurant365.com/react/accounting   # journal entries
playwright-cli -s=r365b open --headed https://bowerygroup.restaurant365.com/react/accounting  # GL report
```

`playwright-cli` binds sessions to the working directory. Stay in one directory for a whole run, and never `cd` mid run or the sessions vanish.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting any of this. R365 is a legacy Angular app whose grids and report dialogs ignore scripted input and fail silently, and every rule in that file was paid for with a wrong or empty entry. It is shared with the `bowery-ubereats` and `bowery-grubhub` skills, so fix R365 platform behavior there once rather than in three places.

## The period

Bowery's DoorDash period runs **Monday to Sunday**, and the journal entry is dated the **Sunday that ends the period**, so 8/31 through 9/6 posts to the entry dated 9/6. The GL report window is the period itself.

DoorDash pays that period the following **Thursday**, so the period ending 9/6 settles on the payout dated 9/10. The payout's own date sits four days outside the period it covers, which is why the covered window has to be read off the payout rather than inferred from its date.

## Logins

Credentials live in `~/.claude/bowery-credentials.md`, outside any repo. Read them from there rather than asking the human. Missing or rejected credentials are the one case worth asking about.

DoorDash logs in through `identity.doordash.com` in two steps: fill the email, click **Continue to Log In**, then fill the password and click **Log In**.

**DoorDash then demands two factor authentication, and the first click does not show the code dialog.** It renders "This action requires two-factor authentication" beside the password field and nothing else. Click **Log In** a second time to get the dialog, which mails a 6-digit code to the merchant address. Hand the keyboard over for the code and say so. Never guess or wait on it. One DoorDash session serves the whole run.

R365 posts a username and password form at `identity.restaurant365.com`. Log in, then reach pages through the app menu or a known route. Guessing a hash route logs the session out. `scripts/r365-login.sh <session>` does this and is safe to re-run.

## The four stores

| DoorDash | R365 location |
|---|---|
| `Cookshop` | `200 - Cookshop` |
| `Rosie's (2nd St)` | `Rosie's` |
| `Shuka (Macdougal St)` | `Shuka` |
| `Vic's (Great Jones St)` | `Vic's` |

R365 writes Rosie's and Vic's with a curly apostrophe. Match locations on an ASCII fragment (`Rosie`, `Vic`) so shell quoting never has to carry the character.

## Phase 1: the DoorDash figures

**Payouts**, at `merchant-portal.doordash.com/merchant/financials`. It opens on **Last 30 days** across **All businesses and stores**, which already covers a single period's four payouts. Each row reads date paid, payout id, amount, store, so one snapshot of the list gives every id the run needs.

Click a row to open its detail. Three mechanics govern the page:

- **Only real clicks register.** Use `playwright-cli click` against a snapshot ref rather than an `eval` click.
- **Go back through the breadcrumb `Payouts` button**, resolved from a fresh snapshot each time, since its ref changes on every render. With a detail open, a click on another row does nothing.
- A **Qualtrics survey overlay** sometimes covers the page. Close it before clicking anything under it.

The detail header states the covered window verbatim, and it is the only trustworthy source for which period a payout settles:

```
Payout #610462132 for transactions from 12:15 PM on Aug 31, 2026, to 11:04 PM on Sep 6, 2026 for Cookshop
```

A window narrower than the period is normal and not a problem. Vic's read Sep 1 to Sep 5 for the 8/31 to 9/6 period, because those were its only order days.

Per store, read the header's window and these five figures: **Net total** (Paid), **Sales**, **Commission & fees**, **Marketing spend** and **Amendments**. Commission & fees and Marketing spend show as negatives and enter R365 as positive debits.

**Amendments carries either sign, and its sign picks the column.** A negative is a charge against the merchant and posts as a debit. A positive is a credit back to the merchant and posts as a credit. Shuka's week ran positive at 218.70 while the other three ran negative or zero, so read the sign per store rather than assuming a charge.

Check each store before moving on: `Sales - Commission & fees - Marketing spend + Amendments` equals Net total, with each card taken at its displayed sign. This closes to the penny when the figures are read right.

## Phase 2: the period debits

The daily journal entries debit `104-05 - A/R - Door Dash` with each day's third party sales including tax. The period's debits, call this **D**, are what the entry clears.

Reports > My reports in `r365b`. Run **GL Account Detail** through Customize with account `104-05 - A/R - Door Dash`, Start the period's first day, End its last day, the location filter on all locations, and **Subtotal By** set to **Location**. Read each location's `Total A/R - Door Dash` **Debit** figure, which is that store's D.

The window is the period because Subtotal By groups only when the window holds detail rows. A window after the period holds none, so the report collapses to one ungrouped total.

Each location's block also shows a beginning balance and a Bank Deposit line clearing it. That pair confirms the prior period's payout landed; a missing deposit is worth reporting before posting.

## The arithmetic

The entry carries five lines, keyed by the comment R365 already holds on each template line. The template says "commissions & fees" where DoorDash's card says "Commission & fees", so copy the comments off the entry verbatim:

```
credit "a/r debit from prior week less total payout"  =  D - Net total
debit  "commissions & fees"                           =  Commission & fees shown positive
debit  "marketing spend"                              =  Marketing spend shown positive
       "amendments"                                   =  Amendments, debit if DoorDash showed it negative,
                                                         credit if positive
       "difference"                                   =  D - Sales
                                                         debit if positive, credit if negative
```

The A/R line posts to `104-05`, and the four others all post to `632-02 - Delivery Fees`.

**The difference line equals `D - Sales` exactly.** That falls out of the payout identity rather than approximating it, so it is a real check on every other figure: compute the difference as the plug that balances the entry, then confirm it against `D - Sales`. A mismatch means one of the five DoorDash figures or D was read wrong. It is the gap between what R365 booked as third party sales and what DoorDash counted, and it ran from 20.00 to 205.53 across the four stores in a typical week.

**Do not use the account's beginning balance for the credit.** Beginning balance equals D only while the prior period's payout has already been deposited and booked. Payouts lag by four days and sometimes miss a week, and when one is outstanding the beginning balance carries it, pushing the whole undeposited receivable into the difference line and expensing it to Delivery Fees.

**Check the resulting A/R balance instead.** After the credit posts, the account's balance for that location should equal Net total, which is the receivable awaiting the next deposit. This confirms the formula in one subtraction and works even in a week with no prior entry to compare against.

## Finding the entries

Bowery carries one DoorDash entry per week, dated the Sunday that ends the period.

Accounting > Transactions > All transactions, route `/react/accounting/legacy/AllTransactions`. Filter Number (`Contains`) to `Door`, then harvest every entry and its id from the grid's data source in one call rather than clicking through rows. `R365-AUTOMATION.md` carries the call and the direct entry URL it feeds.

Each entry arrives as a template: five lines carrying accounts, comments, and location, every amount at 0.00. **Read the comments off the first entry you open and use them verbatim** for the rest of the run, since the posting script keys every line by its comment text.

Entries from before September 2026 are a two line reclass between `104-05` and `104-00` and reproduce none of the arithmetic above, so an older week is worth checking rather than trusting as a model. Verify against the A/R balance instead.

## Posting

Fill the five lines, save, reload, then Approve and Close. Three checks decide whether an entry is right, and skipping any of them is how empty and unbalanced entries reach Approved:

1. **Read back every amount** from its cell after typing it. Compare numerically, since R365 renders `4` as `4.00`.
2. **Sum the lines before saving** and match both sides against the expected total. Sum the named rows only, because the footer row would double the count.
3. **Reload after saving**, and confirm the values survived. A save that never reached the server leaves every line at 0.00, and approving then commits an empty entry.

`scripts/post-entry.sh` does all of this for one store and refuses to approve anything that fails a check:

```bash
ENTRY_DATE=9/6/2026 scripts/post-entry.sh r365 Cookshop work.json
```

Run stores in parallel by giving each worker its own session name in the same directory. See `scripts/work.example.json` for the work file's shape, which carries each line's comment and column alongside its amount. A line whose amount is 0 is skipped, which is what a store with no amendments wants.

If the automated save will not land after a retry, re-enter the amounts, tell the human, and let them click Save, Approve, and Close.

## Verifying the run

Refilter the All Transactions grid and read every row back from the grid's data source, checking status is **Approved** and the amount matches the planned total for that store. Verify from the grid rather than from what the posting step reported, since a worker reports what it believes and the grid reports what R365 holds.

Report the table of stores, payout ids, amounts, and totals, and report any store that failed just as plainly.

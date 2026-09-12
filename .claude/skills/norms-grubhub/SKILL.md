---
name: norms-grubhub
description: Reconcile Grubhub deposits into the matching NORMS Restaurant365 journal entries, for one store or for the whole estate in a batch. Use when asked to post or balance a NORMS Grubhub deposit in R365, to pull a store's Grubhub period figures, or to check the A/R Grubhub balance against a deposit.
---

# Grubhub deposit into a NORMS journal entry

Two phases. **Gather** every figure first, from Grubhub and from one GL report, then **post** the entries. Both phases read in bulk, so a 24 store run costs about the same reading as a single store.

Sessions:

```bash
playwright-cli open --headed https://restaurant.grubhub.com/login                       # Grubhub
playwright-cli -s=r365 open --headed https://norms.restaurant365.com/react/accounting   # journal entries
playwright-cli -s=r365b open --headed https://norms.restaurant365.com/react/accounting  # GL report
```

`playwright-cli` binds sessions to the working directory. Stay in one directory for a whole run, and never `cd` mid run or the sessions vanish.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting any of this. R365 is a legacy Angular app whose grids and report dialogs ignore scripted input and fail silently, and every rule in that file was paid for with a wrong or empty entry. It is shared with the `norms-ubereats` skill, so fix R365 platform behavior there once rather than in two places.

## The period

The Grubhub period runs **Tuesday to Monday**, so September's first period is 9/1 through 9/7. The journal entry is dated the **Saturday inside the period**, 9/5 for that one, and the GL report window is the period itself, 9/1 through 9/7.

The period settles the following Wednesday: 9/1 through 9/7 paid out on 9/9.

The Uber Eats period is Monday to Sunday and its entry is dated the Sunday that ends it. Carrying that habit here reads a window one day off.

## Logins

Credentials live in `~/.claude/norms-credentials.md`, outside any repo. Read them from there rather than asking the human. Missing or rejected credentials are the one case worth asking about.

Grubhub takes email and password at `restaurant.grubhub.com/login`. If it challenges with a mailed code, hand the keyboard over and say so. One Grubhub session serves the whole run.

R365 posts a username and password form at `identity.restaurant365.com`. Log in, then reach pages through the app menu or a known route. Guessing a hash route logs the session out. `scripts/r365-login.sh <session>` does this and is safe to re-run.

## The estate

Grubhub carries 25 stores and R365 carries 24 Grubhub locations. **Encino is on Grubhub and has no R365 location**, so it produces nothing. A store with no deposit for the period is a real outcome: report it and post nothing for it.

Grubhub names each store by street and R365 names it by city, so the two never match on text. Map through the street address, which Grubhub keeps in `localStorage.associatedRestaurants`:

| Grubhub store | Address | R365 location |
|---|---|---|
| `S Indian Hill Blvd` | 807 S Indian Hill Blvd, Claremont | Claremont |
| `Valley Blvd` | 10620 Valley Blvd, El Monte | El Monte |
| `Lakewood Blvd` | 17844 Lakewood Blvd, Bellflower | Lakewood |
| `N La Cienega Blvd` | 470 N La Cienega Blvd, Los Angeles | La Cienega |
| `E Slauson Ave` | 2500 E Slauson Ave, Huntington Park | Slauson |
| `E 17th St` | 102 E 17th St, Santa Ana | Santa Ana |
| `Hawthorne Blvd` | 18705 Hawthorne Blvd, Torrance | North Torrance |
| `Tyler St` | 3889 Tyler St, Riverside | Riverside |
| `Rosemead Blvd` | 4422 Rosemead Blvd, Pico Rivera | Pico Rivera |
| `N Azusa Ave` | 501 N Azusa Ave, West Covina | West Covina |
| `Whittier Blvd` | 14810 Whittier Blvd, Whittier | Whittier |
| `N Euclid St` | 1125 N Euclid St, Anaheim | Anaheim |
| `Beach Blvd` | 16572 Beach Blvd, Huntington Beach | Huntington Beach |
| `E Katella Ave` | 1550 E Katella Ave, Orange | Orange |
| `Sherman Way` | 13640 Sherman Way, Van Nuys | Van Nuys |
| `Firestone Blvd` | 7955 Firestone Blvd, Downey | Downey |
| `Harbor Blvd` | 2150 Harbor Blvd, Costa Mesa | Costa Mesa |
| `S Avalon Blvd` | 20420 S Avalon Blvd, Carson | Carson |
| `Pacific Coast Hwy` | 2448 Pacific Coast Hwy, Lomita | South Torrance |
| `W Imperial Hwy` | 2960 W Imperial Hwy, Inglewood | Inglewood |
| `1325 W Renaissance Pkwy` | Rialto | Rialto |
| `East Mills Circle` | 4551 East Mills Circle, Ontario | Ontario |
| `5453 Hollywood Boulevard` | Los Angeles | Hollywood |
| `72` | 4605 W Charleston Blvd, Las Vegas NV | Las Vegas |
| `16573 Ventura Blvd, Encino` | Encino | none |

Four of these carry a city the store name never mentions: Bellflower is Lakewood, Huntington Park is Slauson, Lomita is South Torrance, and the store Grubhub calls `72` is Las Vegas. Two more share the city Los Angeles and split into La Cienega and Hollywood.

**Confirm the whole mapping in one pass** by checking each R365 location's beginning balance against that store's previous deposit. They agree to the penny for a store whose prior period settled, which turns the mapping from a guess into a check.

## Phase 1: the Grubhub figures

**Financials > Deposit history**, reached through the hamburger at the top left. Select all locations, click **Apply**, then set the date range through the range textbox, which takes a `fill` of `MM/DD/YYYY - MM/DD/YYYY`.

The range filters on the date each deposit was **paid**, so it has to cover the days after the period closes. Run it from a week before the period to today.

Clicking each deposit ID to read its fee breakdown costs 24 rounds of click, read, and Back. **Read the figures from the API the page itself calls**, which returns the same breakdown the detail panel renders:

```js
const tok   = sessionStorage.getItem('authToken');
const rests = JSON.parse(localStorage.getItem('associatedRestaurants'));   // id, name, streetAddress, city
const H = {authorization: 'Bearer ' + tok, accept: 'application/json', 'content-type': 'application/json'};
const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';

// deposits per store, ten stores per call
await fetch(base + ids.join(',') + '/deposits/summary?startTime=...&endTime=...', {headers: H});
// one deposit in full
await fetch(base + restId + '/deposits/' + dep.restaurant_distribution_id, {headers: H});
```

The summary call returns each deposit with an empty `totals`, so the per deposit call is what carries the figures. Its `totals` block is what the journal lines need, in cents and signed as Grubhub shows them:

| `totals` field | Journal line |
|---|---|
| `prepaid_total` | gross sales, checks the arithmetic |
| `commission_total` | commissions |
| `grubhub_delivery_fee_total` | delivery commissions |
| `processing_fee` | order processing fees |

`total` on the deposit itself is the net paid. Per store, record the deposit's `short_distribution_id`, its net, and those three fee lines. Grubhub shows fees as negatives and they enter R365 as positive debits. The R365 template carries one line for each, so keep them apart rather than summing them.

Check each store before moving on: `prepaid_total` plus every signed fee equals the deposit `total`. A store that fails this carries a row the three fee lines do not model, and the leftover is real: **Las Vegas settles in Nevada and carries `withheld_sales_tax`**, which no journal line names, so it lands in the difference.

`associated_transactions` carries a `transaction_time` per order, so the sales dates a deposit covers can be read rather than assumed. Convert to `America/Los_Angeles` before comparing, since the raw times are UTC and a late evening order reads as the next day. A deposit routinely omits a day at one end of the period and reaches back into the previous one, and that gap is what the difference line absorbs.

If a single period settles as more than one deposit for a store, sum the net deposits, sum each fee line separately, and note both IDs.

## Phase 2: the period debits

The daily journal entries debit `1113 - A/R Grubhub` with each day's third party sales including tax. The period's debits, call this **D**, are what the entry clears.

Reports > My reports in `r365b`. Run **GL Account Detail** through Customize with account `1113 - A/R Grubhub`, Start 9/1 and End 9/7, the location filter on all locations, and **Subtotal By** set to **Location**. Read each location's `Total A/R Grubhub` **Debit** figure, which is that store's D.

The window is the period because Subtotal By groups only when the window holds detail rows. A window after the period holds none, so the report collapses to one ungrouped total.

Each location's block also shows a beginning balance and a Bank Deposit line clearing it. That pair confirms the prior period's deposit landed, and it is what checks the store mapping. A beginning balance larger than the prior deposit means an older receivable is still outstanding, which is worth reporting before posting.

## The arithmetic

The entry carries five lines, keyed by the comment R365 already holds on each template line:

```
credit "ar grubhub - deposit"     =  D - net deposit
debit  "commissions"              =  Commissions
debit  "delivery commissions"     =  Delivery Commissions
debit  "order processing fees"    =  Order Processing Fees
       the plug line              =  (D - net deposit) - the three fees
                                     debit if positive, credit if negative
```

The a/r line posts to `1113 - A/R Grubhub`, and the three fee lines to `5514 - Online Ordering Expense`.

**The plug line's comment and account differ between stores**, while the first four read the same everywhere. In one period it was `refund & discrepancy` at fifteen stores, `refund + difference` at five, `difference` at two, `refund` at one, and `refund & discrepany`, spelled that way, at Las Vegas. Santa Ana books it to `5915 - Delivery over Short` rather than `5514`. **Harvest every comment from each store's own entry before filling anything**, since the posting script keys each line by its comment text and the template check refuses a store whose comment it cannot find.

The plug reduces to `D - gross sales`, the gap between what R365 booked as third party sales and what Grubhub settled. It runs to tens of dollars on a store whose deposit missed a sales day, and it takes either sign. Roughly half the estate lands at 0.00 in a typical period, which is a normal result to record and approve.

**Las Vegas carries a sixth line.** Nevada is a marketplace facilitator state, so Grubhub withholds and remits the sales tax, and R365 books Las Vegas third party sales net of it. The template holds a `sales tax` line on `2116 - Sales Tax Payable-Nevada` that takes `withheld_sales_tax` as a debit, and the plug then falls out as an equal credit:

```
debit  "sales tax"                =  withheld_sales_tax
       the plug line              =  (D - net deposit) - the three fees - the tax
```

The three fees alone come to `D - net deposit` for this store, so the tax and the plug offset each other exactly. That is what the prior approved entry does, and it is the check that the line belongs on `2116` rather than in the plug.

**Do not use the account's beginning balance for the credit.** Beginning balance equals D only while the prior period's deposit has already been booked. Deposits lag by several days and sometimes miss a period, and when one is outstanding the beginning balance carries it, pushing the whole undeposited receivable into the fifth line and expensing it to Online Ordering Expense.

**Check the resulting A/R balance instead.** After the credit posts, the account's balance for that location should equal the net deposit, which is the receivable awaiting settlement. This confirms the formula in one subtraction and works even in a period with no prior entry to compare against.

A store whose beginning balance was larger than its prior deposit fails that equality by exactly the uncleared amount, and it is still right: the older receivable stays in A/R rather than being expensed. Report the store and the amount.

**Verify the formula against the previous period before posting a batch.** Open one store's prior approved GrubHub entry and confirm its five amounts reproduce from that period's D and deposit. This catches a changed process in one store's worth of work rather than the whole estate's.

## Finding the entries

R365 carries one Grubhub entry per period, dated the Saturday inside it, so the period Sep 1 - Sep 7 posts to the entry dated Sep 5.

Accounting > Transactions > All transactions, route `/react/accounting/legacy/AllTransactions`. Harvest every entry and its id from the grid's data source in one call rather than clicking through rows. [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) carries the call and the direct entry URL it feeds.

Filtering through the grid's own data source works, and it skips the header input and its real-Enter dance:

```js
g.dataSource.filter({logic: 'and', filters: [{field: 'Number', operator: 'contains', value: 'Grub'}]});
```

`Grub` catches both `GrubHub` and `Grub Hub`. Each entry arrives as a template: five lines carrying accounts, comments, and location, every amount at 0.00, six for Las Vegas.

Read the lines off each entry with the account and comment together, and match the line rows on shape rather than on account number:

```js
rows.filter(r => r.length === 9 && /^[0-9]{4} - /.test(r[1] || '') && (r[5] || '').trim())
```

Filtering on `5514` instead drops Santa Ana's plug line and Las Vegas's tax line, and a template that reads four lines long is the symptom.

## Posting

Fill the five lines, save, reload, then Approve and Close. Three checks decide whether an entry is right, and skipping any of them is how empty and unbalanced entries reach Approved:

1. **Read back every amount** from its cell after typing it. Compare numerically, since R365 renders `4` as `4.00`.
2. **Sum the lines before saving** and match both sides against the expected total. Sum the named rows only, because the footer row would double the count.
3. **Reload after saving**, and confirm the values survived. A save that never reached the server leaves every line at 0.00, and approving then commits an empty entry.

`scripts/post-entry.sh` does all of this for one store and refuses to approve anything that fails a check:

```bash
ENTRY_DATE=9/5/2026 scripts/post-entry.sh r365 Anaheim work.json
```

It also refuses to start on a store whose template is missing any comment the work file names, which is what catches the fifth line before an amount is typed. Run stores in parallel by giving each worker its own session name; four sessions of six stores each covers the estate. See `scripts/work.example.json` for the work file's shape, which carries each line's comment text alongside its amount.

If the automated save will not land after a retry, re-enter the amounts, tell the human, and let them click Save, Approve, and Close.

## Verifying the run

Refilter the All Transactions grid and read every row back from the grid's data source, checking status is **Approved** and the amount matches the planned total for that store. The grid's `Amount` is the balanced total, so it equals the debit side of the work file. Verify from the grid rather than from what the posting step reported, since a worker reports what it believes and the grid reports what R365 holds.

Report the table of stores, deposit IDs, amounts, and totals, and report any store that failed just as plainly.

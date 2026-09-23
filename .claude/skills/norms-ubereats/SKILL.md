---
name: norms-ubereats
description: Reconcile Uber Eats payouts into the matching NORMS Restaurant365 journal entries, for one store or for the whole estate in a batch. Use when asked to post or balance an Uber Eats payout in R365, to pull a store's Uber Eats pay period figures, or to check the A/R Uber Postmates balance against a payout.
---

# Uber Eats payout into a NORMS journal entry

Two phases. **Gather** every figure first, from Uber Eats and from one GL report, then **post** the entries. Both phases read in bulk, so a 24 store run costs about the same reading as a single store.

Sessions:

```bash
playwright-cli open --headed https://merchants.ubereats.com/manager/                    # Uber Eats
playwright-cli -s=r365 open --headed https://norms.restaurant365.com/react/accounting   # journal entries
playwright-cli -s=r365b open --headed https://norms.restaurant365.com/react/accounting  # GL report
```

`playwright-cli` binds sessions to the working directory. Stay in one directory for a whole run, and never `cd` mid run or the sessions vanish.

Read [`R365-AUTOMATION.md`](R365-AUTOMATION.md) before scripting any of this. R365 is a legacy Angular app whose grids and report dialogs ignore scripted input and fail silently, and every rule in that file was paid for with a wrong or empty entry. It is shared with the `norms-grubhub` skill, so fix R365 platform behavior there once rather than in two places.

## Logins

Credentials live in `~/.claude/norms-credentials.md`, outside any repo. Read them from there rather than asking the human. Missing or rejected credentials are the one case worth asking about.

Uber Eats mails a 4-digit code to the merchant address. Fill the email field, then hand the keyboard over for the code and say so. Never guess or wait on it. One Uber session serves the whole run, since each new session triggers another code.

R365 posts a username and password form at `identity.restaurant365.com`. Log in, then reach pages through the app menu or a known route. Guessing a hash route logs the session out.

## Phase 1: the Uber figures

Payments > Payouts. Store names vary in form, `NORMS - Carson` beside `NORMS (Ontario Mills)`, so type the store into the picker's search box and read back what it finds. The picker list is virtualized, so scroll it to enumerate every store. Checking the radio leaves the page on the old store until you click **Apply**, and switching stores resets the date range.

The picker's radio labels carry no text, so a `label:has-text(...)` selector matches nothing. Click the store name itself. One store, scripted:

```bash
playwright-cli click '[data-testid=location-selector-button-testid]'
playwright-cli fill 'input[placeholder="Search"]' "NORMS - Carson"
playwright-cli click 'p:text-is("NORMS - Carson")'
playwright-cli click 'button:text-is("Apply")'
playwright-cli click 'input[aria-label="Select a date range."]'
playwright-cli click '[aria-label*="September 15th 2026"]'   # any day inside the period
```

Read the button's text back after Apply to confirm the switch took. The URL's `settlement` parameter belongs to one store, so a hand-built URL loads the wrong store's settlement.

The date control opens on a **Pay period** tab. Period length is a store setting, one week for some stores and two for others, so the tab label (`Pay period Aug 3 - Aug 16`) names the loaded period. Clicking any date selects the whole period containing that date and writes `start` and `end` into the URL. The page states the loaded range as `Selected date range is from 09/14/2026 to 09/20/2026`, so check that sentence for every store.

Per store, read off the Overview tab: store name, Total Payout, Earnings, and the Marketing, Uber Fees, and Net Chargeback Amount rows of Pay breakdown. Uber shows Marketing and Uber Fees as negatives and they enter R365 as positive debits. Net Chargeback carries either sign, and its sign decides its column.

Two reading traps:

- Pay breakdown drops a row that is 0.00. The **Net Chargeback Amount** card at the top of the page covers that case, and the card and the row share a label, so scope the row lookup to the Pay breakdown block.
- Some stores carry rows the five journal lines do not model, **Other payments** among them. They land in the difference line, which is correct, so record them rather than dropping them.

Check each store before moving on: `Earnings + Marketing + Uber Fees + Net Chargeback + Net Taxes` equals `Total Payout`. A store that fails this has an unmodeled row worth finding.

## Phase 2: the period debits

The daily `Third Party Delivery` journal entries debit `1112 - A/R Uber Postmates` with each day's third party sales. The period's debits, call this **D**, are what the entry clears.

Reports > My reports in `r365b`. On the GL Account Detail card pick the **UberEats** view, then Customize. It loads with account `1112 - A/R Uber Postmates` and Filter By Location.

Set **Start to the pay period's first day and End to its last day**, leave the location filter on all locations, set **Subtotal By** to **Location**, and Run. Read each location's `Total A/R Uber Postmates` **Debit** figure, which is that store's D.

The window is the pay period because Subtotal By groups only when the window holds detail rows. A window after the period holds none, so the report collapses to one ungrouped total.

Subtotal By can show Location as active and still return an ungrouped report. The detail rows carry the same figures, so sum them yourself. In the snapshot's cell list each row runs date, type, location, comment, debit, credit, balance; the location is the cell before the comment. D is the sum of a location's `Journal Entry` debits. The `Bank Deposit` rows are the Uber payouts landing, and they only carry credits. Check that the per-location debits add up to the report's `Total A/R Uber Postmates` debit.

## The arithmetic

```
credit on "a/r ubereats - payout"  =  D - Total Payout
debit  on "marketing"              =  Marketing
debit  on "uber fees"              =  Uber Fees
debit  on "net chargeback amount"  =  Net Chargeback shown negative
credit on "net chargeback amount"  =  Net Chargeback shown positive
difference                         =  D - Earnings, debit if positive, credit if negative
```

The difference line is the gap between what R365 booked as third party sales and what Uber reports as earnings. It lands at 0.00 for roughly half the stores in a typical week, which is a normal result to record and approve.

**Do not use the account's beginning balance for the credit.** Beginning balance equals D only while the prior period's payout has already been deposited and booked. Deposits lag by several days and sometimes miss a week, and when one is outstanding the beginning balance carries it, pushing the whole undeposited receivable into the difference line and expensing it to Online Ordering Expense. In one 24 store run that error would have written off 23,584.09.

**Verify the formula against the previous week before posting a batch.** Run the GL report a second time over the prior pay period. For each location, the `Journal Entry` debits are prior D and the `Journal Entry` credit is the approved UberEats credit. `prior D - approved credit` is the prior Total Payout, and it must equal that store's `Bank Deposit` credit in the current period's report. This checks the whole estate from two reports with no Uber reading. A store that fails has a changed process or a missed deposit; before posting it, pull its prior period Uber figures and compare them directly.

## Store to location mapping

The estate is 24 stores, and Uber spells the name three ways: `NORMS - Anaheim`, `NORMS (Hollywood)`, `Norms (Rialto)`. Match case-insensitively. A case-sensitive `NORMS` finds 22 and drops `Norms (Las Vegas)` and `Norms (Rialto)` without saying so.

Most Uber store names carry the R365 location word. The R365 location reads `<number> - <store>`, so match on the word rather than the whole name. Three do not match by name:

| Uber Eats | R365 location |
|---|---|
| `NORMS - Bellflower` | `215 - Lakewood` |
| `NORMS - Los Angeles` | `250 - La Cienega` |
| `NORMS (Huntington Park)` | `211 - Slauson` |

Stores > All stores (`/manager/stores`) prints a store count and lists each store as `<R365 number>|<uber id> • <address>`, which settles both the enumeration and the mapping. It shows five stores a page, so page through with **Next**. Hollywood, Ontario Mills, and Las Vegas carry a uuid in place of the number, so confirm those three by address.

D and Earnings run within a few percent for most stores and 10% to 16% apart for a handful, so the gap says little about a pairing. It lands in the difference line either way.

## Finding the entries

R365 carries one entry per week dated that week's Saturday, whatever length Uber settles on. A settlement belongs on the entry dated the **Saturday inside the pay period**, so the period Aug 31 - Sep 6 posts to the entry dated Sep 5. Where a settlement spans two weeks it covers two Saturdays and the whole settlement belongs on the later one, leaving the earlier week's entry Approved at 0.00.

Accounting > Transactions > All transactions, route `/react/accounting/legacy/AllTransactions`. Filter Number (`Contains`) to `UberEats`, then harvest every entry and its id from the grid's data source in one call rather than clicking through rows. [`R365-AUTOMATION.md`](R365-AUTOMATION.md) carries the call and the direct entry URL it feeds.

Each entry arrives as a template: five lines carrying accounts, comments, and location, every amount at 0.00.

## Posting

Fill the five lines, save, reload, then Approve and Close. Three checks decide whether an entry is right, and skipping any of them is how empty and unbalanced entries reach Approved:

1. **Read back every amount** from its cell after typing it. Compare numerically, since R365 renders `4` as `4.00`.
2. **Sum the five lines before saving** and match the total against the expected figure. Sum the five named rows only, because the footer row would double the count.
3. **Reload after saving**, and confirm the values survived. A save that never reached the server leaves every line at 0.00, and approving then commits an empty entry.

`scripts/post-entry.sh` does all of this for one store and refuses to approve anything that fails a check:

```bash
ENTRY_DATE=9/19/2026 scripts/post-entry.sh r365 Anaheim work.json
```

`ENTRY_DATE` is the Saturday inside the pay period and moves 7 days each week, so set it per run. Run stores in parallel by giving each worker its own session name; three sessions of eight stores each covers the estate.

If the automated save will not land after a retry, re-enter the amounts, tell the human, and let them click Save, Approve, and Close.

## Verifying the run

Refilter the All Transactions grid and read every row back from the grid's data source, checking status is **Approved** and the amount matches the planned total for that store. Verify from the grid rather than from what the posting step reported, since a worker reports what it believes and the grid reports what R365 holds.

Report the table of stores, amounts, and totals, and report any store that failed just as plainly.

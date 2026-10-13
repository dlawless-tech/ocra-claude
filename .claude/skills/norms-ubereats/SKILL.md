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

Uber Eats mails a 4-digit code to the merchant address. `scripts/uber-login.sh <session>` opens Uber on the saved profile `~/.claude/playwright-profiles/norms-ubereats`, fills the email, and waits for the human to type the code into the open window; `NOTIFY=1` also posts a Teams card tagging the code contact. Never guess the code. One Uber session serves the whole run, since each new session triggers another code.

The email page's Continue button carries an icon, so `button:text-is("Continue")` matches nothing and `has-text` also hits "Continue with Google". Click `role=button[name="Continue"s]`.

R365 posts a username and password form at `identity.restaurant365.com`. Log in, then reach pages through the app menu or a known route. Guessing a hash route logs the session out.

## Phase 1: the Uber figures

`scripts/uber-read.sh <session> "<Uber store name>" "Oct 11"` reads one store and prints one JSON line: `payout`, `earnings`, `marketing`, `fees`, `nc`, `other`, and the store and period as Uber prints them. Loop it over every store into `uber.jsonl`, one store a minute. Go to the page with `goto https://merchants.ubereats.com/manager/payments`; the sidebar's Payouts link does not navigate, and a "Rewards Center" popup (`Ok got it`) can cover the page after login.

Payments > Payouts (redesigned by 10/13/2026) lists a **Payout History** table per store, one row per pay period (`Oct 05–11, 2026`, or `Sep 28–Oct 11, 2026` for a two-week store), with Earnings, Marketing, Uber fees, Amendments and Net Payout. Clicking the row opens the pay period page, whose breakdown **Expand all** opens into labeled lines. The figures the entry needs, all confirmed against the posted 10/3/2026 Anaheim entry:

| Entry line | Uber line |
|---|---|
| Earnings | Gross Sales > `Sales (excl. tax)` |
| Marketing | Marketing section total less its `Tax On ...` lines (`Offers on items (excl. VAT)` + `Offer Redemption Fee`) |
| Uber Fees | Uber Fees section total (`Net Marketplace Fee`) |
| Net Chargeback | Amendments > every `... chargebacks (excl. tax)` line, `Disputed chargebacks` included |
| Total Payout | `Total payout` |

Uber shows Marketing and Uber Fees as negatives and they enter R365 as positive debits. Net Chargeback carries either sign, and its sign decides its column. Taxes (`Tax on Sales`, `Marketplace Facilitator Tax`, tax on offers and chargebacks) net to about zero and are left out. `other` is whatever the five figures do not explain, `Total payout - (Earnings - Marketing - Fees + Net Chargeback)`; it lands in the difference line, so record it rather than dropping it.

The store picker: store names vary in form, `NORMS - Carson` beside `NORMS (Ontario Mills)`, so type the store into the picker's search box. Its radio labels carry no text and the store name sits in a span inside each `List item` button, so click that button from `eval`, matching the name exactly, then **Apply**. The pay period page heading names the store as Uber now prints it, sometimes with a city suffix (`NORMS - Van Nuys (Los Angeles)`, `NORMS (Hollywood) (Los Angeles)`). The URL's `settlement` parameter belongs to one store, so a hand-built URL loads the wrong store's settlement.

## Phase 2: the period debits

The daily `Third Party Delivery` journal entries debit `1112 - A/R Uber Postmates` with each day's third party sales. The period's debits, call this **D**, are what the entry clears.

Reports > My reports in `r365b`. On the GL Account Detail card pick the **UberEats** view through the card's `View ▼` button, which lists views as buttons, then Customize. It loads with account `1112 - A/R Uber Postmates` and Filter By Location.

Set **Start to the pay period's first day and End to its last day**, leave the location filter on all locations, set **Subtotal By** to **Location**, and Run. Read each location's `Total A/R Uber Postmates` **Debit** figure, which is that store's D.

The window is the pay period because Subtotal By groups only when the window holds detail rows. A window after the period holds none, so the report collapses to one ungrouped total.

Subtotal By can show Location as active and still return an ungrouped report, and the same dialog run twice has come back once of each shape. The detail rows carry the same figures in both, so sum them yourself. In the snapshot's cell list each row runs date, type, location, comment, debit, credit, balance; the location is the cell before the comment. A row ends at the next date cell or the next `Total A/R Uber Postmates` cell, whichever comes first, which parses either shape. D is the sum of a location's `Journal Entry` debits. The `Bank Deposit` rows are the Uber payouts landing, and they only carry credits. Check that the per-location debits add up to the report's `Total A/R Uber Postmates` debit.

## The arithmetic

```
credit on "a/r ubereats - payout"  =  D - Total Payout
debit  on "marketing"              =  Marketing
debit  on "uber fees"              =  Uber Fees
debit  on "net chargeback amount"  =  Net Chargeback shown negative
credit on "net chargeback amount"  =  Net Chargeback shown positive
difference                         =  D - Earnings - other, debit if positive, credit if negative
```

`node scripts/glparse.js <cells.txt> <gl.json>` turns a GL report snapshot's cells into per-location figures, once for this period and once for the prior one. `scripts/harvest.js`, with `__DATE__` replaced by the entry date, returns the entries from the All Transactions grid. `node scripts/build-work.js <uber.jsonl> <gl-cur.json> <gl-prior.json> <entries.json> <work.json>` applies this arithmetic and the prior-week check, flags any unbalanced store, and writes the work json the posting scripts take.

A difference far beyond the usual few percent usually means a missing day of sales in R365. Look at the location's daily `Third Party Delivery` rows in the GL report before posting; on 10/13/2026 Van Nuys had no 10/10 or 10/11 rows and was off 652.24, so it was held.

The difference line is the gap between what R365 booked as third party sales and what Uber reports as earnings. It lands at 0.00 for roughly half the stores in a typical week, which is a normal result to record and approve.

**Do not use the account's beginning balance for the credit.** Beginning balance equals D only while the prior period's payout has already been deposited and booked. Deposits lag by several days and sometimes miss a week, and when one is outstanding the beginning balance carries it, pushing the whole undeposited receivable into the difference line and expensing it to Online Ordering Expense. In one 24 store run that error would have written off 23,584.09.

**Verify the formula against the previous week before posting a batch.** Run the GL report a second time over the prior pay period. For each location, the `Journal Entry` debits are prior D and the `Journal Entry` credit is the approved UberEats credit. `prior D - approved credit` is the prior Total Payout, and it must equal that store's `Bank Deposit` credit in the current period's report. This checks the whole estate from two reports with no Uber reading. A store that fails has a changed process, a missed deposit, or a sales day booked after last week's entry was filled; before posting it, pull its prior period Uber figures (`uber-read.sh` with the prior period's last day) and compare them directly. When the prior Uber payout equals the deposit, the prior entry is the one that is off: post this week, and report the prior entry's correction.

**A deposit that has not landed never holds an entry.** The entry needs only this period's D and this period's Uber figures, so post it the same day. A store with no `Bank Deposit` row passes the check when its prior period Uber Total Payout equals `prior D - approved credit`: the deposit is late, and the check is done. Only a mismatch there holds the store, since it means the process changed. Report late deposits with their amounts so the human can chase them.

## Store to location mapping

The estate is 24 stores, and Uber spells the name three ways: `NORMS - Anaheim`, `NORMS (Hollywood)`, `Norms (Rialto)`. Match case-insensitively. A case-sensitive `NORMS` finds 22 and drops `Norms (Las Vegas)` and `Norms (Rialto)` without saying so.

Most Uber store names carry the R365 location word. The R365 location reads `<number> - <store>`, so match on the word rather than the whole name. Three do not match by name:

| Uber Eats | R365 location |
|---|---|
| `NORMS - Bellflower` | `215 - Lakewood` |
| `NORMS - Los Angeles` | `250 - La Cienega` |
| `NORMS (Huntington Park)` | `211 - Slauson` |

The store picker prints a store count and lists each store as `<R365 number>|<uber id> • <address>`, which settles both the enumeration and the mapping. Collect the list by scrolling the picker's scroll container from `eval`, harvesting the two paragraphs of each `List item` button as it renders. Hollywood, Ontario Mills, and Las Vegas carry a uuid in place of the number, so confirm those three by address.

D and Earnings run within a few percent for most stores and 10% to 16% apart for a handful, so the gap says little about a pairing. It lands in the difference line either way.

## Finding the entries

R365 carries one entry per week dated that week's Saturday, whatever length Uber settles on. A settlement belongs on the entry dated the **Saturday inside the pay period**, so the period Aug 31 - Sep 6 posts to the entry dated Sep 5. Where a settlement spans two weeks it covers two Saturdays and the whole settlement belongs on the later one, leaving the earlier week's entry Approved at 0.00.

Accounting > Transactions > All transactions, route `/react/accounting/legacy/AllTransactions`. Filter Number (`Contains`) to `UberEats`, then harvest every entry and its id from the grid's data source in one call rather than clicking through rows. [`R365-AUTOMATION.md`](R365-AUTOMATION.md) carries the call and the direct entry URL it feeds.

Each entry arrives as a template: five lines carrying accounts, comments, and location, every amount at 0.00. Read `ApprovalStatus` at harvest, since it picks the posting script. The 10/3/2026 templates all arrived **Approved** at 0.00.

## Posting

Fill the five lines, save, reload, then Approve and Close. Three checks decide whether an entry is right, and skipping any of them is how empty and unbalanced entries reach Approved:

1. **Read back every amount** from its cell after typing it. Compare numerically, since R365 renders `4` as `4.00`.
2. **Sum the five lines before saving** and match the total against the expected figure. Sum the five named rows only, because the footer row would double the count.
3. **Reload after saving**, and confirm the values survived. A save that never reached the server leaves every line at 0.00, and approving then commits an empty entry.

`scripts/post-entry.sh` does all of this for one store and refuses to approve anything that fails a check:

```bash
ENTRY_DATE=9/19/2026 scripts/post-entry.sh r365 Anaheim work.json
```

`ENTRY_DATE` is the Saturday inside the pay period and moves 7 days each week, so set it per run.

`post-entry.sh` skips an Approved entry. For a template that arrived Approved at 0.00, `scripts/edit-entry.sh` takes the same arguments and work json, fills the lines through Edit and Edit Complete, and leaves the entry Approved, with the same three checks:

```bash
ENTRY_DATE=10/3/2026 scripts/edit-entry.sh r365 Anaheim work.json
```

Run stores in parallel by giving each worker its own session name; three sessions of eight stores each covers the estate.

If the automated save will not land after a retry, re-enter the amounts, tell the human, and let them click Save, Approve, and Close.

## Verifying the run

Refilter the All Transactions grid and read every row back from the grid's data source, checking status is **Approved** and the amount matches the planned total for that store. Verify from the grid rather than from what the posting step reported, since a worker reports what it believes and the grid reports what R365 holds.

Report the table of stores, amounts, and totals, and report any store that failed just as plainly.

## Closing the sessions

Once the grid check passes, close every browser session the run opened, the Uber session and each R365 session including any parallel workers:

```bash
for S in default r365 r365b; do playwright-cli -s=$S close; done
```

Run `playwright-cli list` first and close only the sessions this run opened, leaving any that were already open when it started. Close from the same working directory the run used, since sessions bind to it.

## Unattended run

`scripts/monday-run.ps1` runs from Task Scheduler on Mondays at 17:00 (`scripts/register-task.ps1` sets it up, with a one-off catch-up on Tue 10/13/2026 09:00). It covers the Monday to Sunday pay period that ended the Sunday before and writes `started.txt` in the work directory first, so a period runs once; `-Force` reruns it, and `-Date yyyy-MM-dd` stands in for today.

The wrapper logs the Uber session `nue` in before starting the skill: `uber-login.sh` with `NOTIFY=1` tags the code contact in the TPD Teams channel and waits 60 minutes for the code. No code fails the run with a Teams card and posts nothing. Then it starts this skill headless with a prompt beginning `Unattended run`, naming the period, the work directory, and `ENTRY_DATE`.

No human answers during the run, so:

- Never ask. Use session names `nue` (Uber, already logged in), `nur` and `nurb` (R365), all from the repo root. Never open a second Uber session, since it costs another code.
- Run the prior-week check. A store that fails it and whose prior Uber Total Payout also disagrees with `prior D - approved credit` is `held`, posted nothing, with both figures in `warnings`.
- Per store, an entry that already carries amounts is `skipped`. Approve, or for an Approved template finish Edit Complete, only when every check in **Posting** passes; a store that fails one is `failed`, with the failing step in `warnings`, and the others carry on.
- Late deposits go in `warnings` with their amounts; the store still posts.
- A store missing a day of `Third Party Delivery` sales in the period is `held`, posted nothing, with the missing dates and the D vs Earnings gap in `warnings` (user ruling, 10/13/2026). The human reruns it once the sales are booked, or adds it to the carryover list.
- `.scratch/norms-ubereats/carryover.json` lists held stores from earlier periods, each with its period, `entryDate`, `transactionId`, `workDir`, and Uber figures. Before this week's stores, rerun the GL report over each one's period, and if its sales are now complete, rebuild its row with `build-work.js` from its `workDir` files and post it with `ENTRY_DATE` set to its `entryDate`. Add it to `result.json` as its own store row, with the period in `warnings`. Remove it from the list once it is approved. If its sales are still missing, keep it on the list and report it as `held`.
- A store whose two-week settlement leaves this week's entry at 0.00 is `skipped` with that reason.

Finish with **Verifying the run**, close the three sessions by name, then write `result.json` in the work directory. The wrapper posts it to Teams through `scripts/notify-teams.ps1`, tagging the confirmation contact, and tags the code contact instead when the file is missing:

```json
{ "period": "10/5/2026 - 10/11/2026", "date": "10/10/2026", "note": "",
  "stores": [ { "store": "Anaheim", "status": "approved", "amount": 368.85, "transactionId": "...", "warnings": [] } ] }
```

`status` is `approved`, `skipped`, `held`, or `failed`; `amount` is the entry's total debits. The webhook lives in `~/.claude/norms-ubereats.json`, outside the repo: `{"teamsWebhook": "<url>", "codeMention": {"name", "email"}, "doneMention": {"name", "email"}}`. `codeMention` is tagged for the login code and for failures, `doneMention` on every finished run.

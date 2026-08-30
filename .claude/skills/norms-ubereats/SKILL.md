---
name: norms-ubereats
description: Reconcile an Uber Eats payout into the matching NORMS Restaurant365 journal entry for one store. Use when asked to post or balance an Uber Eats payout in R365, to pull a store's Uber Eats pay period figures, or to check the A/R Uber Postmates balance against a payout.
---

# Uber Eats payout into a NORMS journal entry

Three `playwright-cli` sessions run side by side, one per system, because the figures come from Uber Eats and land in two different R365 pages.

```bash
playwright-cli open --headed https://merchants.ubereats.com/manager/                    # Uber Eats
playwright-cli -s=r365 open --headed https://norms.restaurant365.com/react/accounting   # the journal entry
playwright-cli -s=r365b open --headed https://norms.restaurant365.com/react/accounting  # the GL report
```

Both R365 sessions need their own login. Every command carries its session flag, so decide which browser a step belongs to before running it.

## Logins

Credentials live in `~/.claude/norms-credentials.md`, outside any repo. Read them from there rather than asking the human. Missing or rejected credentials are the one case worth asking about.

Uber Eats mails a 4-digit code to the merchant address. Fill the email field, then hand the keyboard over for the code and say so. Never guess or wait on it.

R365 posts a username and password form at `identity.restaurant365.com`, then redirects to `/#/default`. Navigate to the page you actually want after the redirect lands.

## The pay period figures

Payments > Payouts. Store names vary in form on the Uber side, `NORMS - Carson` beside `NORMS (Ontario Mills)`, so type the store into the picker's search box and read back what it finds. Checking the radio leaves the page on the old store until you click **Apply**. The R365 location for the same store reads `<number> - <store>`, so match on the store word rather than the whole trailing name.

The date control opens on a **Pay period** tab. Period length is a store setting, one week for some stores and two for others, so the tab label (`Pay period Aug 3 - Aug 16`) is what names the loaded period. Clicking any date selects the whole period containing that date and writes `start` and `end` into the URL. Ask for half a settlement and you get the settlement, which is the figure a payout reconciles against.

Read off the Overview tab: the store name, Total Payout, Earnings, and the Marketing, Uber Fees, and Net Chargeback rows of Pay breakdown. Uber shows Marketing and Uber Fees as negatives; they enter R365 as positive debits. Net Chargeback carries either sign, and its sign decides its column. Pay breakdown drops a row that is 0.00, and the Net Chargeback Amount card at the top of the page covers that case.

## Finding the journal entry

Accounting > Transactions > All transactions, in the `r365` session. The grid sits inside two nested iframes and its second row is the filter row, whose cells follow header order: Approval Status, Location, Transaction Type, Number, Date. Filter Number (`Contains`) to `UberEats` and Location (`Contains`) to the store, then press Enter. R365 carries one entry per week dated that week's Saturday, whatever length Uber settles on. A settlement belongs on the entry dated the **Saturday inside the pay period**, so the period Aug 10 - Aug 16 posts to the entry dated Aug 15. Where a settlement spans two weeks it covers two Saturdays and the whole settlement belongs on the later one, leaving the earlier week's entry Approved at 0.00. An empty Date filter lists the store's history, and a store can carry several unapproved weeks at once, so pick the row by date and read the entry's own date field back before filling it.

The Number cell holds `<font onclick="fireNumber(this)">`, so a plain click only selects the cell. Fire the handler instead, then switch to the tab it opens:

```bash
playwright-cli -s=r365 eval "el => el.querySelector('font').click()" <cell-ref>
playwright-cli -s=r365 tab-list
playwright-cli -s=r365 tab-select 1
```

The entry arrives as a template: five lines carrying accounts, comments, and location, with every amount at 0.00.

## The beginning balance

Reports > My reports in the `r365b` session. On the GL Account Detail card pick the **UberEats** view, then Customize. It loads with account `1112 - A/R Uber Postmates` and Filter By Location.

Setting the location filter has one trap: click the Select All **checkbox element** to clear the selections, since clicking its label text closes the popup with everything still selected. Then search the store name, check `<number> - <store>`, and click OK. The parameter should read the store name back before you go on.

Set Start to the Monday after the pay period ends and End to the Saturday after that Monday, then Run. These two dates bound the balance reading, and the entry date stays the Saturday inside the period. The report opens in a new tab; read the `Beg Balance:` cell.

## Filling the entry

```
credit on "a/r ubereats - payout"  =  Beg Balance - Total Payout
debit  on "marketing"              =  Marketing
debit  on "uber fees"              =  Uber Fees
debit  on "net chargeback amount"  =  Net Chargeback shown negative
credit on "net chargeback amount"  =  Net Chargeback shown positive
debit  on "difference"             =  whatever balances the entry
```

Cells edit through their input names after a click, and typing keystrokes into them lands nowhere:

```bash
playwright-cli -s=r365 click <cell-ref>
playwright-cli -s=r365 fill 'input[name="credit"]' "1083.07"   # or input[name="debit"]
playwright-cli -s=r365 press Tab
```

The footer debit and credit totals recompute as each value commits. Matching totals there prove R365's own model holds the figures.

Two numbers cross-check the pay period itself: `Beg Balance` equals that period's Earnings, and `difference` lands at 0.00. A nonzero difference points at the period rather than at the arithmetic.

## Save, approve, verify

Ribbon buttons are menu openers, so a click on `Save` or `Approve` commits nothing. Hover the button, then click the item you want out of the submenu it reveals. Save through `Save`, which sits beside `Save and New` and `Save and Close`. Approve through `Approve and Close`, beside `Approve` and `Approve and New`:

```bash
playwright-cli -s=r365 hover <save-ref>
playwright-cli -s=r365 click <submenu-save-ref>
playwright-cli -s=r365 reload                      # the save stays unproven until the server says so
playwright-cli -s=r365 hover <approve-ref>
playwright-cli -s=r365 click <approve-and-close-ref>
```

Lines back at 0.00 and a status of Unapproved after that reload mean the save never landed. Re-enter the amounts, tell the human the automated save is not landing, and let them click Save, Approve, and Close themselves.

The entry is done when the All Transactions grid, refiltered and reloaded, shows the store's row as **Approved** carrying the entry amount. Report that row, and report a failed save just as plainly.

## Refs go stale

Every action in these grids reshuffles refs, and a committed cell edit renumbers the whole row. Re-run `find` or `snapshot` for a fresh ref before each step rather than reusing one from earlier in the run. The `input[name=...]` and `#id` selectors survive, which is why the cell edits use them.

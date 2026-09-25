---
name: bowery-weekly-mgmt-fees
description: Post the weekly management fee journal entry into Bowery Group Restaurant365, charging each store its share of the fee and moving the cash to Bowery Group Corp, from the BWRY - Mgmt Fees & IC Transfers workbook. Use when asked to fill, balance, or approve the Bowery Management Fees entry in R365, or to check a week's fees against that workbook.
---

# Weekly management fees into the Bowery journal entry

Bowery Group Corp charges each store a management fee every week and sweeps the same amount from the store's bank account to Bowery's. The client computes the fees in a workbook; this skill copies the prior week's entry and loads that week's fees into it.

```
c:\Users\trici\OCRA\TML's Files - General\Downloads\BWRY - Mgmt Fees & IC Transfers.xlsx
```

Ask the human for the file if it is missing or its Week Ending is not the week being posted.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365, for the login, the side-menu walk to All Transactions, and the grid data source. The duplicate, save, and approve behavior lives in [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) under **Duplicate saves on click**, **A rejected save answers 200**, and **Ribbon buttons are menu openers**; the same R365 build serves both hosts.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh mf
```

## The week

The workbook's **Week Ending** (cell D5 of the **Mgmt Fee Funding** tab) is a Sunday, and the entry is dated that Sunday. The week ending 9/20/2026 posts to the entry dated 9/20/2026.

## Step 1: read the fees

```bash
node <skill>/scripts/read-sheet.js "<workbook>" > fees.json
```

It reads the store block (Restaurant, Sales, % of Total, Mgmt Fees) and rounds each store's Mgmt Fees to the cent. It stops when the Week Ending is not a Sunday, when the tab holds anything other than the five stores, when the store fees miss the Total row, or when the JE block under Debit/Credit disagrees with the store block.

`entryAmount` in `fees.json` is twice the sum of the rounded fees, which is what the All Transactions grid shows. The workbook's own check cell ("This should match the total JE") doubles the unrounded total and can read a cent high: 153,999.57 against the posted 153,999.56 on 9/20/2026. Trust `entryAmount`.

The **Intercompany payments** tab is a separate set of cash transfers with its own weekly entry, and does not feed this one.

## Step 2: the entry

Filter All Transactions through the grid's data source on Number `Management Fees`. Since 9/13/2026 each week carries one Journal Entry numbered exactly `Management Fees`, header location `800 - Bowery Group Corp`, 20 lines, four per store:

```
debit   660-00 - Management Fees           fee   store location           comment <store>
credit  402-00 - Management Fee Income     fee   800 - Bowery Group Corp  comment <store>
credit  <store cash account>               fee   store location           comment <store> -> Bowery Transfer
debit   100-20 - Cash - Bowery Op / Payroll (5381)   fee   800 - Bowery Group Corp   comment <store> -> Bowery Transfer
```

| Workbook   | Location        | Cash account                               |
|------------|-----------------|--------------------------------------------|
| Cookshop   | 200 - Cookshop  | 100-10 - Cash - Cookshop Operating (4360)  |
| Shuka      | 400 - Shuka     | 100-03 - Cash - Shuka Op / Payroll (2636)  |
| Rosie's    | 500 - Rosie's   | 100-05 - Cash - Rosie's Operating (8778)   |
| Shukette   | 600 - Shukette  | 100-06 - Cash - Shukette Op/Pay (2502)     |
| Vic's      | 700 - Vic's     | 100-08 - Cash - Vic's Op / Payroll (9807)  |

R365 spells the Vic's and Rosie's locations with a curly apostrophe; the scripts normalize it. Earlier entries are numbered `Management Fees w/e <date>`, dated the Monday, and one extra 30,000 entry on 9/6/2026 covered a transfer to Static Honey. Leave those alone.

An Approved entry dated the Week Ending means the week is done; stop and report it.

## Step 3: duplicate the prior week

Open the prior week's entry at `https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/<TransactionId>` and use **Action > Duplicate**. A dialog asks `Duplicate transaction and attachments?`; answer **No, transaction only**, so the prior week's workbook stays off the new entry. The copy is written to the server on that click, opens in a second tab (`tab-select 1`), numbered `NJ000xxxxx` and dated today. `fill` then `press Tab` on `#journalEntryDate` (the Week Ending) and `#journalEntryNumber` (`Management Fees`), read both back, and save once before touching lines:

```bash
bash <skills>/danny-coops-payroll/scripts/save.sh mf
```

A committed save prints `[["1","<id>"," "],["1",""]]`. Record the new id from it.

## Step 4: set the lines

```bash
node <skill>/scripts/set-lines.js fees.json > set.js
playwright-cli -s=mf eval "$(cat set.js)"
```

It classifies each line by account and location (Bowery-side lines by the store name at the start of the comment), sets all four lines of each store to that store's fee, and resets every comment to the plain form above. It returns `set 20 lines, debits X credits X` with X equal to `entryAmount`, or a `STOP:` naming the line it could not place, and it changes nothing on a stop.

The comment reset clears any one-off note a duplicate carries from the prior week.

Then save with `save.sh` and read the body.

## Step 5: attach the workbook

Every entry carries the workbook it was built from. The line grid's attachment panel holds **Upload File**; a real click opens a file chooser, which `playwright-cli upload` answers. Copy the workbook into the working directory first, since `upload` takes a path relative to it:

```bash
cp "<workbook>" .
playwright-cli -s=mf click <button "Upload File" ref>
playwright-cli -s=mf upload "BWRY - Mgmt Fees & IC Transfers.xlsx"
```

The upload lands on its own, with no save. It is done when a link named `BWRY - Mgmt Fees & IC Transfers.xlsx` shows in the panel after a reload.

## Step 6: verify and approve

Reload the entry by its id and compare the server copy against the workbook:

```bash
playwright-cli -s=mf eval "$(cat <skill>/scripts/read-lines.js)" > readback.txt
node <skill>/scripts/check-lines.js fees.json readback.txt
```

It prints `MATCH` only when the date is the Week Ending, the number is `Management Fees`, there are 20 lines, debits equal credits at `entryAmount`, and each store's four lines carry its fee. A third argument checks a different number, such as a test entry's.

Approve through a real click on `#Approve > a` then `li[data-testid="approveAndCloseMenuItem"]`, and confirm `"Successfully Approved."` in the `Transaction/Approve` response. The week is done when the All Transactions grid, after `dataSource.read()`, shows the Week Ending's `Management Fees` row Approved at `entryAmount`.

Report the `check-lines.js` table, the entry's status and amount from the grid, and whether the workbook is attached.

## Test entries

A test run numbers the copy `Management Fees TEST` and stops short of approving. Delete it afterward through **Action > Delete** and answer **Yes** to `Are you sure you wish to delete?`; the tab closes on success. Confirm no `TEST` row remains on All Transactions. First run 9/25/2026 against the 9/20/2026 week, which matched on every line with the workbook attached.

---
name: bowery-weekly-ic-transfers
description: Post the weekly intercompany cash transfer journal entry into Bowery Group Restaurant365, settling each entity's intercompany balance, from the BWRY - Mgmt Fees & IC Transfers workbook. Use when asked to fill, balance, or approve the Bowery Intercompany Transfers entry in R365, or to check a week's transfers against that workbook.
---

# Weekly intercompany transfers into the Bowery journal entry

Each week the client settles the intercompany balances between Bowery Group Corp and the five stores, and sometimes between two stores, by bank transfer. The workbook's **Cash Transfers to Make** block lists each transfer as From, To, Amount; this skill copies the prior week's entry and loads that week's transfers into it.

```
c:\Users\trici\OCRA\TML's Files - General\Downloads\BWRY - Mgmt Fees & IC Transfers.xlsx
```

The same workbook feeds the Management Fees entry, so it usually arrives alongside a `bowery-weekly-mgmt-fees` run. Ask the human for the file if it is missing or its Week Ending is not the week being posted.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365, for the login, the side-menu walk to All Transactions, the grid data source, and the new-row form. The duplicate, save, and approve behavior lives in [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) under **Duplicate saves on click**, **A rejected save answers 200**, and **Ribbon buttons are menu openers**.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh ic
```

## The week

The entry is dated the workbook's Week Ending, a Sunday, read from cell D5 of the **Mgmt Fee Funding** tab. The intercompany tab's balance sheet reads `As of` the Sunday one week earlier: the 9/20/2026 entry settles the balances as of 9/13/2026.

## Step 1: read the transfers

```bash
node <skill>/scripts/read-transfers.js "<workbook>" > transfers.json
```

The intercompany tab changes shape between weeks: `Intercompany` on 9/13/2026, `Intercompany payments` on 9/20/2026, with the entity columns reordered and renamed. The reader finds the tab by its `Intercompany` prefix and the block by its `From` / `To` / `Amount` headers, and reads rows down to the block's total. It stops on an unknown party, a transfer to itself, two transfers between the same parties, a balance sheet date that is not the week before, or transfers that miss the stated total. Zero-amount rows are dropped.

`total` in `transfers.json` is the entry amount the All Transactions grid shows, and matches the block's "This should match the total JE" cell.

**Follow the From / To columns exactly.** Direction flips when an entity's balance changes sign. Vic's paid Bowery on 9/13/2026; on 9/20/2026 the workbook reads Bowery to Vic's, and the posted entry still moved the cash Vic's to Bowery.

## Step 2: the entry

Filter All Transactions through the grid's data source on Number `Intercompany Transfers`. Each week carries one Journal Entry numbered exactly that, header location `800 - Bowery Group Corp`, two lines per transfer and no other lines:

```
credit  <From party's cash account>   amount   From party's location   comment <From> -> <To> Transfer
debit   <To party's cash account>     amount   To party's location     comment <From> -> <To> Transfer
```

| Workbook  | Location                 | Cash account                                |
|-----------|--------------------------|---------------------------------------------|
| Bowery    | 800 - Bowery Group Corp  | 100-20 - Cash - Bowery Op / Payroll (5381)  |
| Cookshop  | 200 - Cookshop           | 100-10 - Cash - Cookshop Operating (4360)   |
| Shuka     | 400 - Shuka              | 100-03 - Cash - Shuka Op / Payroll (2636)   |
| Rosie's   | 500 - Rosie's            | 100-05 - Cash - Rosie's Operating (8778)    |
| Shukette  | 600 - Shukette           | 100-06 - Cash - Shukette Op/Pay (2502)      |
| Vic's     | 700 - Vic's              | 100-08 - Cash - Vic's Op / Payroll (9807)   |

The 9/13 and 9/20/2026 entries each ran 12 lines: the five stores with Bowery and Shukette to Shuka. The workbook names the parties in the table's first column; R365 spells Vic's and Rosie's with a curly apostrophe, and the scripts normalize it.

An Approved entry dated the Week Ending means the week is done; stop and report it.

## Step 3: duplicate the prior week

Open the prior week's entry at `https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/<TransactionId>` and use **Action > Duplicate**. A dialog asks `Duplicate transaction and attachments?`; answer **No, transaction only**. The copy is written to the server on that click, opens in a second tab (`tab-select 1`), numbered `NJ000xxxxx` and dated today. `fill` then `press Tab` on `#journalEntryDate` (the Week Ending) and `#journalEntryNumber` (`Intercompany Transfers`), read both back, and save once before touching lines:

```bash
bash <skills>/danny-coops-payroll/scripts/save.sh ic
```

A committed save prints `[["1","<id>"," "],["1",""]]`. Record the new id from it.

## Step 4: set the lines

```bash
node <skill>/scripts/set-transfers.js transfers.json > set.js
playwright-cli -s=ic eval "$(cat set.js)"
```

It groups the entry's lines into pairs by the parties in each comment and each line's cash account, then gives every pair its week's amount, direction, and comment. It returns `set N lines, debits X credits X` with X equal to `total`.

When the week's transfers and the entry's pairs differ, it changes nothing and returns one instruction per difference:

- `ADD <From> -> <To> <amount>: credit <account> @ <location>, debit <account> @ <location>` for a transfer the entry lacks. Add both lines through the new-row form under the grid, with the comment `<From> -> <To> Transfer`.
- `REMOVE <pair>` for a pair the week lacks. Delete both lines with their trash icons.

Then rerun `set-transfers.js` until it reports `set`. A `STOP:` names a line that fits no pair; read it before going further. Save with `save.sh` and read the body.

## Step 5: attach the workbook

Every entry carries the workbook it was built from. A real click on **Upload File** in the line grid's attachment panel opens a file chooser, which `playwright-cli upload` answers with a path relative to the working directory:

```bash
cp "<workbook>" .
playwright-cli -s=ic click <button "Upload File" ref>
playwright-cli -s=ic upload "BWRY - Mgmt Fees & IC Transfers.xlsx"
```

The upload lands on its own, with no save. It is done when the workbook's link shows in the panel after a reload.

## Step 6: verify and approve

Reload the entry by its id and compare the server copy against the workbook:

```bash
playwright-cli -s=ic eval "$(cat <skills>/bowery-weekly-mgmt-fees/scripts/read-lines.js)" > readback.txt
node <skill>/scripts/check-transfers.js transfers.json readback.txt
```

It prints `MATCH` only when the date is the Week Ending, the number is `Intercompany Transfers`, the entry holds two lines per transfer, debits equal credits at `total`, and every transfer's credit sits on the From party's cash and its debit on the To party's. A reversed pair reads `MISSING OR REVERSED`. A third argument checks a different number, such as a test entry's.

Approve through a real click on `#Approve > a` then `li[data-testid="approveAndCloseMenuItem"]`, and confirm `"Successfully Approved."` in the `Transaction/Approve` response. The week is done when the All Transactions grid, after `dataSource.read()`, shows the Week Ending's `Intercompany Transfers` row Approved at `total`.

Report the `check-transfers.js` table, the entry's status and amount from the grid, whether the workbook is attached, and any transfer whose direction flipped from the prior week.

## Test entries

A test run numbers the copy `Intercompany Transfers TEST` and stops short of approving. Delete it afterward through **Action > Delete** and answer **Yes** to `Are you sure you wish to delete?`; the tab closes on success. Confirm no `TEST` row remains on All Transactions.

---
name: bowery-weekly-ic-transfers
description: Post the weekly intercompany cash transfer journal entry into Bowery Group Restaurant365, settling each entity's intercompany balance, from the BWRY - Mgmt Fees & IC Transfers workbook. Use when asked to fill, balance, or approve the Bowery Intercompany Transfers entry in R365, or to check a week's transfers against that workbook.
---

# Weekly intercompany transfers into the Bowery journal entry

Each week the client settles the intercompany balances between Bowery Group Corp and the five stores, and sometimes between two stores, by bank transfer. The workbook's **Cash Transfers to Make** block lists each transfer as From, To, Amount; this skill copies the prior week's entries and loads that week's transfers into them.

The client drops the workbook in the Teams folder, and it moves to `Completed` once posted:

```
c:\Users\trici\OCRA\Bowery Group - General\Journal Entries\Mgmt Fees & Intercompany Transfers\<m.d> BG_Mgmt Fees & IC Trfs.xlsx
```

The week's workbook is the one outside `Completed`. The client names the file by hand, and both the name pattern and the date in it drift: `BoweryGroup_9.20_...` held the week ending 9/27/2026. Cell D5 decides the week.

The same workbook feeds the Management Fees entry, so it usually arrives alongside a `bowery-weekly-mgmt-fees` run. Ask the human for the file if it is missing or its Week Ending is not the week being posted.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365, for the login, the side-menu walk to All Transactions, the grid data source, and the new-row form. The duplicate, save, and approve behavior lives in [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) under **Duplicate saves on click**, **A rejected save answers 200**, and **Ribbon buttons are menu openers**.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh ic
```

## The week

The entry is dated the workbook's Week Ending, a Sunday, read from cell D5 of the **Mgmt Fee Funding** tab. The intercompany tab's balance sheet reads `As of` the Sunday one week earlier: the 9/27/2026 entry settles the balances as of 9/20/2026.

## Step 1: read the transfers

```bash
node <skill>/scripts/read-transfers.js "<workbook>" > transfers.json
```

The intercompany tab changes name and shape between weeks: `Intercompany payments` on 9/20/2026, `09.27 Intercompany Transfers` on 9/27/2026, with the entity columns reordered and renamed. The reader finds the tab by the word `Intercompany` in its name and the block by its `From` / `To` / `Amount` headers. A header can sit one column left of its data (10/4/2026: `From` in B16, the names in column C), and the reader then reads the column to its right. It stops on an unknown party, a transfer to itself, two transfers between the same parties, a balance sheet date that is not the week before, or transfers that miss the block's stated total. Zero-amount rows are dropped. The 9/27/2026 block carried no total row; the reader then warns and sums the rows.

`transfers.json` holds the Bowery entry: every transfer with Bowery on one side, and `total`, the amount the All Transactions grid shows. A transfer between two stores posts as its own entry, listed under `separate` (see **Store-to-store transfers**).

**Follow the From / To columns exactly.** Direction flips when an entity's balance changes sign. On 9/20/2026 the workbook read Bowery to Vic's and the posted entry debited Vic's cash, under a stale `Vic's -> Bowery Transfer` comment. The cash accounts carry the direction; the comment follows them.

## Step 2: the entry

Filter All Transactions through the grid's data source on Number `Intercompany Transfers`. Each week carries one Journal Entry numbered exactly that, header location `800 - Bowery Group Corp`, two lines per Bowery transfer and no other lines:

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

The 9/13, 9/20, and 9/27/2026 entries each ran 10 lines, one pair per store. The workbook names the parties in the table's first column; R365 spells Vic's and Rosie's with a curly apostrophe, and the scripts normalize it.

An Approved entry dated the Week Ending means the week is done; stop and report it.

## Store-to-store transfers

A transfer between two stores, with Bowery on neither side, posts as a separate Journal Entry numbered `Intercompany Transfers - <To>/<From>`, header location the To store, holding that transfer's two lines. The 9/13 and 9/20/2026 weeks each carried `Intercompany Transfers - Shuka/Shukette` at `400 - Shuka`: credit Shukette cash @ 600 - Shukette, debit Shuka cash @ 400 - Shuka, comment `Shukette -> Shuka Transfer`.

For each entry under `separate`, write its own file and run Steps 3 to 6 against it, duplicating the prior entry for the same pair and numbering the copy with its `number`:

```bash
node <skill>/scripts/read-transfers.js "<workbook>" Shuka/Shukette > shuka-shukette.json
```

Check the header location on the copy against the file's `location` before saving. A pair with no prior entry is duplicated from any prior store-to-store entry, then relocated.

## Step 3: duplicate the prior week

Open the prior week's entry at `https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/<TransactionId>` and use **Action > Duplicate**. Click the menu row that wraps the `Duplicate` button, the snapshot line just above it; a click on the inner button does nothing. A dialog asks `Duplicate transaction and attachments?`; answer **No, transaction only**. The copy is written to the server on that click, opens in a second tab (`tab-select 1`), numbered `NJ000xxxxx` and dated today. `fill` then `press Tab` on `#journalEntryDate` (the Week Ending) and `#journalEntryNumber` (`Intercompany Transfers`, or the store-to-store `number`), read both back, and save once before touching lines:

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

Every entry carries the workbook it was built from, and R365 takes an upload only on a saved entry: upload after Step 4's save has committed. Reload the entry by its id; the attachment panel renders after the grid, so re-snapshot until **Upload File** shows. A real click on it opens a file chooser, which `playwright-cli upload` answers with a path relative to the working directory:

```bash
cp "<workbook>" .
playwright-cli -s=ic click <button "Upload File" ref>
playwright-cli -s=ic upload "<workbook file name>"
```

The upload lands on its own, with no save. It is done when the workbook's link shows in the panel after a reload.

## Step 6: verify and approve

Reload the entry by its id and compare the server copy against the workbook:

```bash
playwright-cli -s=ic eval "$(cat <skills>/bowery-weekly-mgmt-fees/scripts/read-lines.js)" > readback.txt
node <skill>/scripts/check-transfers.js transfers.json readback.txt
```

It prints `MATCH` only when the date is the Week Ending, the number is the file's `number`, the entry holds two lines per transfer, debits equal credits at `total`, and every transfer's credit sits on the From party's cash and its debit on the To party's. A reversed pair reads `MISSING OR REVERSED`. A third argument checks a different number, such as a test entry's.

Approve through a real click on `#Approve > a` then `li[data-testid="approveAndCloseMenuItem"]`. Approve and Close shuts the entry's tab and takes its request log with it, so the grid is the proof: the week is done when All Transactions, after `dataSource.read()`, shows the Week Ending's `Intercompany Transfers` row, and every store-to-store row, Approved at its `total`.

## Step 7: file the workbook

Once this entry and the week's Management Fees entry both read Approved on the grid, move the workbook into the `Completed` folder beside it. With Management Fees still open, leave the workbook in place and say so.

```bash
mv "<workbook>" "<workbook folder>/Completed/"
```

Report the `check-transfers.js` table for each entry, each entry's status and amount from the grid, whether the workbook is attached, any transfer whose direction flipped from the prior week, and whether the workbook moved to `Completed`.

## Test entries

A test run numbers the copy `Intercompany Transfers TEST`, stops short of approving, and leaves the workbook in place. Delete it afterward through **Action > Delete** and answer **Yes** to `Are you sure you wish to delete?`; the tab closes on success. Confirm no `TEST` row remains on All Transactions.

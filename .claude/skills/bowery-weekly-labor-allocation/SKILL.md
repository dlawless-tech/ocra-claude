---
name: bowery-weekly-labor-allocation
description: Post the weekly labor allocation journal entry into Bowery Group Restaurant365, moving employee wages from the store that paid them to the store they worked for, with payroll taxes at 7.65% of each store's net, from the Bowery Group Labor Allocation workbook. Use when asked to fill, balance, or approve the Bowery Labor Allocation entry in R365, or to check a week's allocation against that workbook.
---

# Weekly labor allocation into the Bowery journal entry

Some employees are paid out of one store and work for another. Each week the client lists them in a workbook, and this skill copies the prior week's entry and loads that week's allocations and payroll taxes into it.

```
c:\Users\trici\OCRA\TML's Files - General\Downloads\Bowery Group Labor Allocation W.E. <m.d.yy>.xlsx
```

A new file arrives each week, named for its week ending. Ask the human for it if the week's file is missing.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365, for the login, the side-menu walk to All Transactions, the grid data source, and the new-row form. The duplicate, save, and approve behavior lives in [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) under **Duplicate saves on click**, **A rejected save answers 200**, and **Ribbon buttons are menu openers**.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh la
```

## The week

The workbook's **Pay Week Ending** (cell D4) is a Sunday, and the entry is dated that Sunday. The file for W.E. 9.20.26 posts to the entry dated 9/20/2026.

## Step 1: read the allocations

```bash
node <skill>/scripts/read-labor.js "<workbook>" > labor.json
```

Each employee row (Employee Name, Wages Paid, Position Paid Under, Location Paid From, Position to Allocate to, Location to Allocate to) becomes one **move**. The position names its wage account:

| Position                                  | Account                        |
|-------------------------------------------|--------------------------------|
| `250 - ...`, or a label containing FOH    | 600-01 - Wages-FOH Management  |
| `251 - ...`, or a label containing BOH or Kitchen | 600-02 - Wages-BOH Management |

The code wins over the label: the 9/20/2026 file wrote Andy's position as `251 - MANAGEMENT`, which is BOH. The 9/13/2026 file wrote `FOH Management` and `BOH Management` with no codes. Any other position stops the reader; ask which 600- account it posts to.

Payroll taxes are 7.65% of each store's net (wages allocated in minus wages paid out), rounded to the cent: a debit for a store that gained labor, a credit for one that gave it. The reader checks the workbook's own tax block against that and stops on a difference.

It also stops when the rounded tax debits miss the credits by a cent; ask which store takes the cent. The wage total and grand total cells are checked when present and are missing from some weeks' files.

`total` in `labor.json` is wages plus tax credits, the entry amount the All Transactions grid shows.

## Step 2: the entry

Filter All Transactions through the grid's data source on Number `Labor Allocation`. Each week carries one Journal Entry numbered exactly that, header location `800 - Bowery Group Corp`: two lines per move, then one tax line per store with a nonzero net.

```
credit  <wage account>                         amount   Location Paid From       comment <employee>
debit   <wage account>                         amount   Location to Allocate to  comment <employee>
debit or credit  610-01 - Payroll Costs-Payroll Taxes   tax   store              comment blank
```

Locations: `200 - Cookshop`, `400 - Shuka`, `500 - Rosie's`, `600 - Shukette`, `700 - Vic's`, `800 - Bowery Group Corp`. R365 spells Vic's and Rosie's with a curly apostrophe, and the scripts normalize it.

The 9/13 and 9/20/2026 entries each ran 14 lines: five moves, all paid from Vic's, and four tax lines.

An Approved entry dated the Week Ending means the week is done; stop and report it.

## Step 3: duplicate the prior week

Open the prior week's entry at `https://bowerygroup.restaurant365.com/#/form/JournalEntryForm/<TransactionId>` and use **Action > Duplicate**. A dialog asks `Duplicate transaction and attachments?`; answer **No, transaction only**. The copy is written to the server on that click, opens in a second tab (`tab-select 1`), numbered `NJ000xxxxx` and dated today. `fill` then `press Tab` on `#journalEntryDate` (the Week Ending) and `#journalEntryNumber` (`Labor Allocation`), read both back, and save once before touching lines:

```bash
bash <skills>/danny-coops-payroll/scripts/save.sh la
```

A committed save prints `[["1","<id>"," "],["1",""]]`. Record the new id from it.

## Step 4: set the lines

```bash
node <skill>/scripts/set-labor.js labor.json > set.js
playwright-cli -s=la eval "$(cat set.js)"
```

It pairs the entry's wage lines (adjacent rows sharing an employee comment) and keys each pair on employee, accounts, and route; tax lines key on location. It then sets every amount and comment from the workbook and returns `set N lines, debits X credits X` with X equal to `total`.

Comments take the workbook's spelling of each name. A pair whose route matches a move but whose name differs is taken as a respelling and reported as `RENAMED`. The 9/13 and 9/20/2026 entries read `Andy Meijas` until 9/25/2026, when both were corrected to the workbook's `Andy Mejias` through Edit and Edit Complete.

When the week's moves or tax lines and the entry's lines differ, it changes nothing and returns one instruction per difference:

- `ADD <employee> <amount>: credit <account> @ <location>, debit <account> @ <location>` for a new move. Add both lines through the new-row form under the grid, comment the employee's name, the credit line directly above the debit line.
- `ADD tax 610-01 @ <location> debit|credit <amount>` for a store newly carrying a net. Add it with a blank comment.
- `REMOVE wage pair ...` or `REMOVE tax line @ <store>` for lines the week lacks. Delete them with their trash icons.

Then rerun `set-labor.js` until it reports `set`. A `STOP:` names a line that fits no pair; read it before going further. Save with `save.sh` and read the body.

## Step 5: attach the workbook

Every entry carries the workbook it was built from. A real click on **Upload File** in the line grid's attachment panel opens a file chooser, which `playwright-cli upload` answers with a path relative to the working directory:

```bash
cp "<workbook>" .
playwright-cli -s=la click <button "Upload File" ref>
playwright-cli -s=la upload "Bowery Group Labor Allocation W.E. <m.d.yy>.xlsx"
```

The upload lands on its own, with no save. It is done when the workbook's link shows in the panel after a reload.

## Step 6: verify and approve

Reload the entry by its id and compare the server copy against the workbook:

```bash
playwright-cli -s=la eval "$(cat <skills>/bowery-weekly-mgmt-fees/scripts/read-lines.js)" > readback.txt
node <skill>/scripts/check-labor.js labor.json readback.txt
```

It prints `MATCH` only when the date is the Week Ending, the number is `Labor Allocation`, the line count is two per move plus the tax lines, debits equal credits at `total`, every move's credit and debit sit on the right account and location under the employee's name, and every tax line is in place. A third argument checks a different number, such as a test entry's.

Approve through a real click on `#Approve > a` then `li[data-testid="approveAndCloseMenuItem"]`, and confirm `"Successfully Approved."` in the `Transaction/Approve` response. The week is done when the All Transactions grid, after `dataSource.read()`, shows the Week Ending's `Labor Allocation` row Approved at `total`.

Report the `check-labor.js` table, the entry's status and amount from the grid, whether the workbook is attached, and any `RENAMED`, `ADD`, or `REMOVE` the run handled.

## Test entries

A test run numbers the copy `Labor Allocation TEST` and stops short of approving. Delete it afterward through **Action > Delete** and answer **Yes** to `Are you sure you wish to delete?`; the tab closes on success. Confirm no `TEST` row remains on All Transactions.

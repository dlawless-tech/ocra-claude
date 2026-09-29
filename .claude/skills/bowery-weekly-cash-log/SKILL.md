---
name: bowery-weekly-cash-log
description: Post the weekly cash log journal entries into Bowery Group Restaurant365, one per store, booking cash tips to Tips Payable and cash payouts to their expense accounts from each store's Cash Deposits & Payouts PDF. Use when asked to fill, balance, or approve the Bowery Weekly Log - Deposits, Tips, Paid Outs entries in R365, or to check a week's entries against the store cash logs.
---

# Weekly cash logs into the Bowery journal entries

Each store sends a weekly PDF: page 1 is the **Weekly Deposit Log** (cash sales, cash tips, cash purchases, deposits by day), page 2 is **Weekly Payouts & Manual Checks**. The cash tips a store holds are owed to staff, and the cash it paid out for purchases never reached the bank. Each store's entry moves the week's tips into Tips Payable, books the payouts to their expense accounts, and leaves the difference in Undeposited Funds.

```
c:\Users\trici\OCRA\Bowery Group - General\Journal Entries\Weekly Cash Logs\<Store> Cash Deposits & Payouts W.E. <M.D.YY>.pdf
```

The week's five PDFs sit at the folder root; each store has its own subfolder for filed weeks. Ask the human for any store whose PDF is missing.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365, for the login, the side-menu walk to All Transactions, the grid data source, and the new-row form. The duplicate, save, delete-line, and approve behavior lives in [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) under **Duplicate saves on click**, **A rejected save answers 200**, **Deleting a line**, and **Ribbon buttons are menu openers**.

Work in one directory for the whole run, since `playwright-cli` binds sessions to it:

```bash
bash <skills>/bowery-ubereats/scripts/r365-login.sh cl
```

## The week

Each log's **Week Ending** is a Sunday, and the entry is dated that Sunday. The logs for the week ending 9/20/2026 post to entries dated 9/20/2026, covering Monday 9/14 through Sunday 9/20.

## Step 1: transcribe the logs

The PDFs defeat text extraction: `pdftotext` scrambles the payout table's columns, and the stores run different templates (Shukette and Vic's log PM only; the 9/27/2026 Cookshop log added manager initials and a Bevager column). Read each PDF with the Read tool, which renders both pages, and transcribe into `logs.json`:

```json
{ "weekEnding": "9/20/2026", "stores": [
  { "store": "Shuka", "file": "Shuka Cash Deposits & Payouts W.E. 9.20.26.pdf", "weekEndingOnLog": "9/20/2026",
    "totalCashTips": 547.32, "cashPurchasesTotal": -44.00,
    "payouts": [ { "date": "9/16/2026", "amount": 40.00, "vendor": "", "description": "for Ania bar stuff", "gl": "510-01 - Purchases-Beverage Liquor" } ] } ] }
```

- `totalCashTips` and `cashPurchasesTotal` are the **Week Total** column of page 1's Total Cash Tips and Cash Purchases rows.
- `payouts` is every filled row of page 2's purchase table, with its Expense Category copied whole as `gl`. Shuka's table heads the vendor column `Vendor & Items`; put that text in `description`.
- `gl` is always the log's own coding. When it fits the item poorly, add `"question"` to that payout, naming the likelier account: `"question": "blueberries coded to liquor, food?"`. It rides in the line comment for the reviewer.
- The manual checks table under it stays out: those checks post through AP. The Over / Short rows stay out too.

Store names are `Cookshop`, `Shuka`, `Rosie's`, `Shukette`, `Vic's`. Re-read any figure the render leaves ambiguous; a transcription slip passes every later check.

## Step 2: build the lines

```bash
node <skill>/scripts/build-lines.js logs.json > lines.json
```

For each store it writes:

```
credit  210-00 - Tips Payable          Total Cash Tips        comment 09.14.26 - 09.20.26
debit   <payout GL>                    sum of payouts on it   comment each payout's "<vendor> - <description> <amount> (Q: <question>)", joined by "; "
debit   100-99 - Undeposited Funds     tips minus payouts     comment 09.14.26 - 09.20.26
```

Payouts on one GL add into one line, and each payout's amount shows in the comment only when the line holds more than one. The entry amount, which the All Transactions grid shows, equals the tips.

It stops when the week is not a Sunday, a store is missing, doubled, or unknown, a log carries another week, a payout lacks a GL, or payouts exceed tips. It prints `WARN` for a payout dated outside the week, for payouts that miss the log's Cash Purchases total, and for each questioned payout. Settle every date and total warning before posting; a questioned payout posts as coded and goes in the report.

The 9/20/2026 Rosie's log listed 140.00 of payouts dated 9/6 with a Cash Purchases total of zero, and its Sunday deposit came up 140.00 short. The dates were stale, the payouts were this week's, and they posted. Check the prior week's entry for the same payouts; post them when it lacks them.

## Step 3: the entries

Filter All Transactions through the grid's data source on Number `Weekly Log - Deposits, Tips, Paid Outs`. Since 9/20/2026 each week carries one Journal Entry per store numbered exactly that, header location the store, every line at the store:

| Log       | Location        |
|-----------|-----------------|
| Cookshop  | 200 - Cookshop  |
| Shuka     | 400 - Shuka     |
| Rosie's   | 500 - Rosie's   |
| Shukette  | 600 - Shukette  |
| Vic's     | 700 - Vic's     |

R365 spells the Rosie's and Vic's locations with a curly apostrophe; the scripts normalize it. A store with an Approved entry dated the Week Ending is done; skip it and report it.

## Step 4: build each store's entry

Take each store's prior-week `TransactionId` from the grid, then per store:

```bash
bash <skill>/scripts/post-store.sh cl lines.json "<store>" <prior TransactionId> "<pdf>"
```

It prints the new id, the line changes, the attachment, and the `check-lines.js` table, and stops at the first step that does not land. Read `MATCH` before approving. What it does, in order, for when a step fails and has to be driven by hand:

1. **Duplicate.** `duplicate.sh` opens the prior entry, clicks **Action**, then the menu row that wraps the `Duplicate` button (a click on the inner button does nothing), and answers **No, transaction only** so the prior week's PDF stays off. The copy is written to the server on that click and opens in a new tab numbered `NJ000xxxxx`, dated today. It fills `#journalEntryDate` and `#journalEntryNumber`, reads both back, and saves through `<skills>/danny-coops-payroll/scripts/save.sh`, whose committed reply is `[["1","<id>"," "],["1",""]]`.
2. **Lines.** `set-lines.js` keys each line by side and GL and sets the week's amount and comment, or changes nothing and returns `ADD <side> <amount> <GL> comment "<text>"` and `REMOVE <side> | <GL>` when the accounts differ. Payout accounts change most weeks. A remove is a real click on `tr[data-uid="<uid>"] .k-grid-delete`. `add-lines.js` adds every missing line through the new-row form's scope, finding the account by its exact label in the form's dropdown, and checks each added row's account, amount, and location. Then `set-lines.js` runs again and must return `set N lines, debits X credits X` with X the store's tips. A `STOP:` names a zero line, a line at another location, two lines on one key, or an account R365 lacks.
3. **Save**, then reload by id.
4. **Attach.** R365 takes an upload only on a saved entry. A real click on **Upload File** under the grid opens a file chooser, which `playwright-cli upload` answers with a path relative to the working directory, so the PDF is copied there first. The upload lands with no save.
5. **Check.** After another reload, the attachment link's title must be the PDF's name, and `check-lines.js` compares the server copy against `lines.json`. It prints `MATCH` only when the date is the Week Ending, the number is right, every line sits at the store, debits equal credits at the tips, and each line carries its GL, amount, and comment.

Snapshot refs read `f12e203` on a session's first tab and `e662` on later ones; match both.

## Step 5: approve

For each store with `MATCH`, open the entry by id, then a real click on `#Approve > a` and on `li[data-testid="approveAndCloseMenuItem"]`. On an entry opened by `goto` the tab stays open after a successful approve. The ribbon then shows `#Unapprove` in place of `#Approve`, and the All Transactions grid, after `dataSource.read()`, shows the store's Week Ending row Approved at the tips. The grid is the proof.

## Step 6: file the logs

Move each approved store's PDF into its subfolder:

```bash
mv "<pdf>" "<Weekly Cash Logs folder>/<Store>/"
```

Report, per store, the `check-lines.js` table, every `WARN` and how it was settled, the grid status and amount, whether the PDF is attached, and whether it moved.

## Test entries

A test run passes `"Weekly Log - Deposits, Tips, Paid Outs TEST"` as `post-store.sh`'s sixth argument, stops short of approving, and leaves the PDF in place. Delete it afterward through **Action > Delete** and answer **Yes** to `Are you sure you wish to delete?`; the page carries a disabled Theme Builder `Delete` ahead of the Action menu's, so take the enabled one. The tab closes on success. Confirm no `TEST` row remains on All Transactions.

First run 9/29/2026 against the 9/27/2026 week: a Shuka test and a Cookshop test (two lines added, one removed) both matched and were deleted, then all five stores posted, matched, and approved with their PDFs attached and filed. `build-lines.js` also reproduced every account, amount, and location of the five 9/20/2026 entries, apart from 40.00 of Cookshop blueberries that the log coded to liquor and the preparer moved to food; those entries' comments were typed by hand.

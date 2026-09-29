---
name: danny-coops-weekly-meat-credit
description: Post the weekly Meat Credit Adj journal entry into Danny & Coop's Restaurant365 at 1.5% of the week's meat AP invoices, and correct any of the prior four weeks that no longer match. Use when asked to fill, balance, or approve the Danny & Coops Meat Credit entry in R365, or to check past meat credits against the Meat Credit report.
---

# Weekly meat credit for Danny & Coops

Each week earns a credit of **1.5% of that week's AP invoices to `52300 - Meat Purchases`**. One journal entry per week books it, and each run also rechecks the four weeks before, since an invoice entered late changes a week that was already posted.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for playwright-cli habits. Work in one scratch directory for the whole run, since `playwright-cli` binds sessions to it and the scripts write `glurl.txt` there:

```bash
bash <skills>/danny-coops-payroll/scripts/r365-login.sh mc
```

## The week

Monday to Sunday, and the entry is dated the **Sunday that ends it**. A run on Monday 9/28/2026 posts the week of 9/21 to 9/27/2026 and reviews the four Sundays before it, 8/30 through 9/20.

## The entry

Number `Meat Credit Adj`, comment `1.5% of weekly purchases`, header location `10100 - Danny & Coop's`, two lines:

| Account | Side | Amount |
|---|---|---|
| 52300 - Meat Purchases | Cr | credit |
| 16000 - Prepaid Expenses | Dr | credit |

## The base

The base is the week's **AP invoices only**: every `AP Invoice` row on 52300 in the week, debit less credit. The Meat Credit report's Meat Purchases row reads lower or higher than that, because it also carries the week's Stock Count inventory adjustment and the Meat Credit Adj entry itself. So the report is the path to the invoices, and its row total is never the base.

```
credit = round(AP invoices x 0.015, 2), half up in cents
```

## Step 1: the invoice totals

```bash
bash <skill>/scripts/gl-url.sh mc
```

It soft-navigates to My Reports, opens Customize on the **Profit and Loss** card showing the saved **Meat Credit** view (Trailing 12 Weeks, operational calendar, As Of Previous), runs it from the dialog's Run button, and clicks the first Meat Purchases figure. That opens GL Account Detail for 52300, whose url carries the session's own User and SQLServer parameters; it saves the url to `glurl.txt`. A hand-built url without those parameters renders an empty parameter page.

Then for each of the five weeks:

```bash
bash <skill>/scripts/week-invoices.sh mc glurl.txt 9/21/2026 9/27/2026
# WEEK 9/27/2026 invoices=20735.00 count=4 credit=311.03
```

Driscoll Foods delivers most weekdays, so a week reads four or five invoices. A week with fewer, or with no invoice on its last days, may still have invoices waiting to be entered: report it and ask before posting it.

## Step 2: the entries

```bash
bash <skill>/scripts/meat-entries.sh mc
```

It lists the newest Meat Credit Adj entries with date, status, amount, and id. Pair each of the five Sundays with its entry. 7/26 and 8/2/2026 carry no entry.

## Step 3: correct the four prior weeks

For each prior week whose entry amount differs from its credit:

```bash
bash <skill>/scripts/post-credit.sh mc <TransactionId> <credit>
```

It unapproves an Approved entry, sets both lines through the grid's Kendo model, saves, reloads and reads both lines back in cents, then approves through **Approve and Close**. It prints `OK: <id> <credit>` or `FAIL:` naming the step. A week whose entry already matches stays untouched.

## Step 4: the new week

When the target Sunday has no entry, duplicate the prior week's and post it:

```bash
bash <skill>/scripts/new-week.sh mc <prior TransactionId> 9/27/2026   # NEW: <id>
bash <skill>/scripts/post-credit.sh mc <new id> <credit>
```

Duplicate writes the copy the moment it is clicked, numbered `NJ000xxxxx` and dated today, so a `new-week.sh` that fails partway leaves an extra entry behind. Find it in All Transactions by that number and finish or delete it before rerunning. The copy keeps the comment and location.

## Verify

Rerun `meat-entries.sh`. The run is done when all five Sundays read Approved at their credit. Report a table of week, invoice total, invoice count, credit, prior amount, and what changed.

## First run

9/29/2026. The prior entries had drifted from the invoices: 8/30 posted 256.60, 9/6 257.82, 9/13 249.06, and 9/20 203.78, which left out that Sunday's 2,860.00 invoice. They were corrected to 268.13, 267.05, 268.13, and 246.68, and 9/27 was created at 311.03. 8/23 already matched at 268.13.

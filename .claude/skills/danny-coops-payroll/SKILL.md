---
name: danny-coops-payroll
description: Post the weekly payroll journal entry into Danny & Coop's Restaurant365 from the account summary and payroll summary exports. Use when asked to build, balance, or approve a Danny & Coops Payroll entry in R365, or to reconcile a Danny & Coops pay week against its payroll files.
---

# Danny & Coops payroll week into the R365 journal entry

The payroll provider exports two CSVs per pay run. Both land in `c:\Users\trici\OCRA\TML's Files - General\Downloads`, and the user often prefixes them with the week (`9.20 Danny & Coops account-summary.csv`), so list the folder and match on the name's tail:

```
account-summary.csv               every amount, by category; ends with the Selected Payrolls period line
payroll-summary_<pay day>.csv     one row per employee plus a totals row; the EE PFL and SDI figures and each employee's net pay
```

The account summary's last line states the period verbatim: `Selected Payrolls,"Sep 7, 2026 - Sep 13, 2026 (Pay day: Sep 18, 2026)"`. The entry is dated the **period end**, a Sunday.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365, and its NORMS twin's section "Duplicate saves on click and drops the payroll dates" in [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md). The same R365 grid runs here.

## The entry

One `Payroll` entry per week, header location `10100 - Danny & Coop's`, with the header's Payroll Start and End dates set to the period. Each week is a duplicate of the prior week, so the lines arrive in this order:

| Account | Side | Amount | Comment |
|---|---|---|---|
| 60050 - Hourly Wages | Dr | Earnings: Wages + Overtime + Non-Hourly Wages | `wages, overtime, non-hourly wages` |
| 67100 - Payroll Taxes | Dr | every Taxes row, less the payroll summary's EE PFL and EE SDI totals | `total taxes - NY PD Fam Leave & SDI` |
| 25100 - Employee Tips Payable | Dr | Earnings: Tips | `tips` |
| 10001 - Danny & Coops Operating 1563 | Cr | Direct Deposit | `direct deposit` |
| 60100 - Manager Salaries | Dr | Earnings: Salaries | `salaries` |
| 67600 - Bonus | Dr | Earnings: Bonus | `bonus` |
| 90760 - Payroll Processing Fees | | 0.00, nothing in the files feeds it | |
| 10001 - Danny & Coops Operating 1563 | Cr | one line per Paper Check | the employee's name |

The paper-check lines track that week's checks exactly: one line per check, none left over. The prior week's check lines get deleted when a week has fewer checks, and new lines get added when it has more.

Deductions (child support) post the same amount as debit and credit in the account summary and stay off the entry. The EE PFL and SDI withholdings are the gap between the account summary's listed debits and its TOTALS line, which is why they come off taxes.

## Build

Work in one scratch directory for the whole run, since `playwright-cli` binds sessions to it. Copy the two CSVs there first: the Downloads path carries an apostrophe that MSYS path conversion mangles.

```bash
node scripts/build-plan.js account-summary.csv payroll-summary_<pay day>.csv
```

The builder stops rather than emitting a plan that fails a check: the two files cover different pay days, the entry is out of balance, the earnings tie between the files fails, a paper check differs from that employee's net pay, a deduction is not a wash, or an unmapped earnings or nonzero reimbursement line appears. A stop on a new line type means asking the user which account it posts to.

## Prove the mapping on the prior week first

Dump the prior week's approved entry and run the builder against its files with `--entry`. A correct mapping prints `entry matches plan`.

Any difference is a changed export, or a prior entry keyed by hand, so stop and read it. Weeks before 9/13 carry a leftover 0.00 check line and no comments, so they never match cleanly.

## Post

1. `scripts/r365-login.sh <session>`, then `scripts/all-transactions.sh <session>`. It lists the latest Payroll entries with date, status, amount, and id. An Approved entry dated the period end means the week is done.
2. Open the prior week's entry by id, then `Action > Duplicate`. The copy opens in a second tab (`tab-select 1`), numbered `NJ000xxxxx` and dated today. `fill` then `press Tab` on `#journalEntryDate` (period end), `#journalEntryNumber` (`Payroll`), `#journalEntryPayrollStartDate`, and `#journalEntryPayrollEndDate`, read all four back, and `scripts/save.sh <session>` before touching lines.
3. `scripts/dump-lines.sh <session> je.json`, then `node scripts/build-plan.js <acct> <payroll> --entry je.json --out edits.json`. Check lines pair with checks by employee name first, then by position. The builder prints `ADD LINE` for each check with no row to sit on and `DELETE row` for each check row the week lacks.
4. `scripts/apply-edits.sh <session> edits.json` sets debit, credit, and comment on each changed row, adds the new check lines, and deletes the unneeded ones. The script prints its `edited`, `added`, and `deleted` counts; they match the builder's output, and `err` is empty.
5. Dump and rerun the builder before saving. Then `save.sh`, reload by passing the id to `dump-lines.sh`, and rerun the builder with `--entry`. It prints `entry matches plan` only when the server copy is right.
6. Approve through **Approve and Close**, then rerun `all-transactions.sh`: the week reads Approved at the planned total.

Report the plan's lines and total, and the final status and amount from All Transactions.

## Danny & Coops R365 quirks

An Approved entry's line grid is read-only until its **Edit** button above the grid is clicked (`button:text-is("Edit")`). The entry stays Approved after the save.


The home dashboard's nav renders with no links for this login, so the Bowery trick of clicking the All Transactions link fails. `all-transactions.sh` routes the SPA with `history.pushState` instead, which only works from a `/react/` page. From any other page it first navigates to the dashboard, which sometimes logs the session out onto an identity-host 404, and re-runs `r365-login.sh` to recover.

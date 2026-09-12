---
name: norms-payroll
description: Post the weekly ADP payroll journal entry into NORMS Restaurant365. Use when asked to fill, balance, or approve a NORMS Payroll entry in R365, to reconcile a payroll week against the ADP Stat Summary, or to break out payroll voids and adjustments by employee.
---

# ADP payroll week into the NORMS journal entry

ADP delivers four files per week. The CSV carries every amount, the Stat Summary says how the cash line splits and is the tie-out, the Labor Distribution names the voids, and the Checks & Vouchers confirms them. Read all four before touching R365.

```
c:\Users\trici\OCRA\NORMS - General\Payroll\WE <MM.DD.YY>\
  WVM_<paydate>_PR&TAX.csv     every amount, by account and dept, DEBIT signed
  WVM Stat Summary.pdf         funding recap, the cash split and the tie-out
  WVM Labor Distribution.pdf   the Void PP: blocks, one per adjustment
  WVM Checks & Vouchers.pdf    per-employee vouchers, confirms void names
```

PDFs read through `pdftotext -layout`. The folder is named for the week ending, the CSV for the pay date, so `WE 09.05.26` holds `WVM_09112026_PR&TAX.csv`.

Read [`MAPPING.md`](MAPPING.md) before building any amount. It carries the account and memo mapping, which lines split by location and which roll up, and the traps that make a plausible entry wrong.

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting R365. It is shared with the delivery skills, so fix platform behavior there once.

## The entry

R365 carries one `Payroll` entry per week, dated that week's **Saturday**, header location `299 - Norms Support Center`, created as a copy of the prior week and left Unapproved. It arrives complete: every account, comment, and location already set, carrying last week's amounts.

**Update amounts only.** Accounts, comments, and locations stay as they are, except the named void lines, whose comments name that week's employees. Where an amount has no line to sit on, add one through the grid's new-row form.

Find it at Accounting > Transactions > All transactions, Number contains `payroll`. One row will be Unapproved.

## Prove the mapping on the prior week first

Apply the mapping to the **prior** week's CSV and compare against that week's approved entry, line by line. A correct mapping reproduces it to the cent. This costs one run and catches a changed ADP file before it reaches 700,000 dollars of postings.

`scripts/build-plan.js --verify` does the comparison and prints every line that fails to match. Four kinds of mismatch are expected, because the CSV is not their source: the named void lines, the `direct deposits` split, the tax rounding, and any suspense disposition. Anything else is a changed ADP file, so stop and read it.

## Gather

1. Parse the CSV. `DEBIT` is signed: positive is a debit, negative a credit. `DEPT_ID` is the R365 location number. Confirm the file sums to zero.
2. Read the Stat Summary page 3 for **Checks**, **Direct Deposits**, **Subtotal Net Pay**, **Adjustments/Prepay/Voids**, and **Total Net Pay Liability**. Confirm Total Net Pay Liability equals the CSV's 1030 total.
3. Grep the Labor Distribution for `Void PP:`. Each block carries a check number and an amount. The manual checks are the ones numbered in the current `223xx` series, running on from the prior week's last number. Confirm they sum to the Stat Summary's Adjustments figure.
4. Confirm each void name and amount against the Checks & Vouchers. A manual check prints with no payroll check number and a `NON-NEGOTIABLE - VOID` marker.

## Build and post

`scripts/build-plan.js` maps the CSV onto the entry's existing lines and emits `[rowIndex, debit, credit]` for every line that changes. Lines with no CSV row behind them this week come back as 0.00, which is how a week without mileage or a sign-on bonus is recorded.

Post with `scripts/apply-amounts.sh` in chunks, then run the three checks. Skipping any of them is how an empty or unbalanced entry reaches Approved:

1. **Read every amount back** from its rendered cell, comparing numerically since R365 renders `4` as `4.00`.
2. **Sum both columns before saving** and match against the planned total.
3. **Reload after saving** and re-read all lines from the server. A save that never reached R365 leaves the old amounts in place, and approving then commits last week's numbers.

Then tie the entry against the Stat Summary:

| Stat Summary | Entry |
|---|---|
| Subtotal Net Pay | `direct deposits (checking / savings)` |
| Adjustments/Prepay/Voids | the named void lines, summed |
| Wage Garnishments | `wage garnishments` |
| 401K/Retirement | `401k / roth` plus `401k loan` |
| Total Taxes | `total taxes` |

Approve through **Approve and Close**, then verify from the All Transactions grid rather than from what the posting step reported: the status reads Approved and the amount matches the planned total.

## Adding a line

The new-row form sits above the line grid: account combobox, debit, credit, comment, location button, Add.

The account combobox refuses `fill`. Click it, `type` the account number with real keystrokes, then ArrowDown and Enter. The location button opens a checkbox list: check the wanted location and uncheck the default before closing.

To move an existing line to another location, copy `locationId` and `location` from a line that already carries it.

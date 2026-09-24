# ADP WVJ file to the R365 Payroll - Support Center entry

Every rule here reproduces the approved 8/20/2026 entry from that period's file, 14 of 16 lines to the cent. The two that differ are the `6050` pair, covered below.

Everything sits at dept `299` and class `130`, so the entry carries one line per account with no location split. The file codes the whole run to `LOCATION_ID` 10, which the entry ignores.

## Accounts

| File account | Memo | R365 account | Comment |
|---|---|---|---|
| 6020 | Salary-Management | `6020 - Salaries-Management` | Salary-Management |
| 6025 | Regular (Hourly), Overtime | `6025 - Salary-Hourly` | regular (hourly) + overtime |
| 6040 | ER SOC SEC, ER MEDICARE, ER SUI, ER FUTA | `6040 - Payroll Tax` | employer taxes |
| 6050 | MED REIMB | `6050 - Health Care` | med reimb |
| 6050 | Dental, Medical, Vision Pre-tax | `6050 - Health Care` | Insurance EE Copay-... (pre-tax) |
| 6050 | Accident, Critical Illness, Hosp Indemnity, Life Ins PostTax, whole Life | `6050 - Health Care` | Insurance EE Copay-... (post-tax) |
| 6110 | Meal Reimbursement | `6110 - Meals and entertainment` | meal reimbursement |
| 6150 | CELL PHONE | `6150 - Cellular Phone` | cell phone |
| 6390 | MILEAGE | `6390 - Gasoline - Mileage-Corp` | mileage |
| 5230 | QTRBA | `5230 - Chef / Director Bonus` | QTRBA |
| 2267 | PTO Taken | `2267 - Accrued PTO` | PTO Taken |
| 2264 | FSA Contribution, HSA Contribution | `2264 - Accrued FSA HSA Deductions` | HSA /FSA Contribution |
| 2142 | 401k Loan 1 | `2142 - 401(k) Loans` | 401k Loan 1 |
| 2140 | 401K, ROTH | `2140 - 401(k) / Roth` | 401K / Roth |
| 2120, 2122, 2124, 2126, 2128, 2130, 2132 | | `1040 - Support Center Payroll-6839` | total taxes |
| 1040 | CHECKINGS, SAVINGS | `1040 - Support Center Payroll-6839` | direct deposit |
| 1040 | Net Amount | `2229 - PR Liability - Stale PR Checks` | returned |
| 9999 at dept 999 | Suspense | `2267 - Accrued PTO` | blank |

Memos arrive in mixed case and mixed spelling, `Med Pre Tax` beside `Medical Pre-tax`. Map on the account, so a new spelling lands correctly on its own.

**The cash account is 1040, and 5210, 5212, 5300, 5320, and 1030 never appear.** Those are the restaurant payroll's accounts, and the WVM mapping does not transfer.

**`build-plan.js` resolves lines by account and slot, never by comment text.** Comment wording drifts between periods, and the two `6050` lines and the two `1040` lines are told apart by a single word in theirs.

## The two lines the file does not name

**`Net Amount` is a returned check.** It looks like a direct deposit and is not one, so it leaves the `direct deposit` line understated by exactly its amount if it lands there. Each gets its own `2229 - PR Liability - Stale PR Checks` line commented `returned`.

Adding the check number to the comment is optional, and the WVJ Checks & Vouchers is where it comes from when it is wanted. Periods through 8/2026 booked these to `1199 - In & Out` commented `<check number> returned`; `--verify` accepts either account against those periods. Reuse any existing returned-check lines, zero any the period does not need, and add lines for any it needs beyond them.

**Suspense goes on the second `2267 - Accrued PTO` line**, the one whose comment is blank. Account `9999` at dept `999` carries no natural home and appears in most periods. Without that line the entry misses balance by exactly the suspense amount.

## The 6050 lines

MED REIMB belongs on the `med reimb` line, and the copay memos fill the one or two lines beside it. **Follow the lines the entry arrives with**, which `build-plan.js` does by counting them:

- **Two copay lines.** Dental, Medical, and Vision Pre-tax go on the one whose comment names a pre-tax memo, and the rest on the other. The 8/6/2026 entry is shaped this way and both lines reproduce to the cent.
- **One copay line.** Every copay memo nets onto it. The 8/20/2026 entry is shaped this way.

A copay line's comment names only some of the memos it carries, so read the account and the line count, never the comment's list.

Some periods also net MED REIMB into a copay line and leave `med reimb` at 0.00. The entry total is the same either way, which is why `--verify` reports those two lines as mismatched against such a period and the run continues.

## Lines the period does not use

The file drops an account entirely when a period has none of it. Mileage, cell phone, meal reimbursement, and the quarterly bonus each disappear and come back. **Any entry line with no file row behind it goes to 0.00**, which leaves the template slot for the period that needs it.

The quarterly bonus is the one that misleads. A second file repeats the prior file's QTRBA unchanged, so the subtraction takes it to 0.00 while the raw figure still reads 36,000.

## Rounding

`total taxes` and `employer taxes` each run a cent or two off the Stat Summary after the subtraction. Use the file's figures and record the difference in the tie-out.

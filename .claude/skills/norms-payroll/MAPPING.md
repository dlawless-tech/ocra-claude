# ADP CSV to the R365 payroll entry

Every rule here reproduces the approved 9/5/2026 entry from that week's CSV, 133 of 143 lines to the cent. The ten that did not are the manual checks, the 1030 split behind them, the tax rounding, and the two lines the Labor Distribution cost center moves, all covered below. The FOH / BOH split reproduces the 9/12/2026 entry, 162 of 167 lines, the five others being its void lines and the 1030 split.

## Detailed by location

One line per location that has the account. `DEPT_ID` is the R365 location number.

| CSV account | R365 account | Comment |
|---|---|---|
| 5210 Regular, Overtime, Meal Penalty, Double Time | `5241 - FOH Hourly` and `5242 - BOH Hourly`, split below | regular / overtime / meal penalty |
| 5210 Sign on bonus or new store bonus | `6030 - MIT/SC Bonus` | sign on bonus |
| 5212 Salary | `5210 - Store Labor (Salary)` | salary |
| 6065 Salary | `5210 - Store Labor (Salary)` | salary |
| 5320 ER SOC SEC, ER MEDICARE, ER SUI, ER FUTA | `5320 - Payroll Taxes` | er taxes |
| 5300, every memo | `5300 - Healthcare` | med/den/vis/dom part/acc/crit ill/hosp ind/life/whole life |
| 6010 General Manager Bonus | `6010 - General Manager Bonus` | general manager bonus |
| 5546 CELL PHONE | `5546 - Cell Phone` | cell phone |
| 5547 and 6390 MILEAGE | `5547 - Mileage` | blank |
| 5230 QTRBA | `5230 - Chef / Director Bonus` | QTRBA |
| 6060 Severance | `6060 - Severance Pay` | severance |

**CSV 5210 is hourly and CSV 5212 is salary.** Hourly posts to the FOH / BOH pair, salary to R365 `5210`. Getting this backwards misposts half a million dollars into accounts that all look right in a total.

**Hourly splits FOH / BOH by the PAY DETAILS LG file**, since the CSV carries no job GL. `build-plan.js --detail` reads it through the shared key in [`../norms-payroll-labor-breakdown/scripts/pay-details.js`](../norms-payroll-labor-breakdown/scripts/pay-details.js), and refuses to plan unless each store's FOH + BOH equals its CSV hourly total to the cent. Both lines carry the hourly comment. A store with no FOH line yet reports one to add.

**Location 370 - Select Industries** posts all its labor, hourly and salary, to one `6025 - Salary-Hourly` line.

**6050 and 6065 are the Support Center's own accounts**, carrying `GLENTRY_CLASSID` 160 where the restaurants carry 115. 6065 folds into the same 5210 line. 6050 keeps its own `6050 - Health Care` line at 299, listed below with the rolled-up accounts.

**QTRBA and severance follow the Labor Distribution cost center**, read off the employee's record as `Cost: <location> <account>`. The CSV can code severance to dept 299 while the earning sits in a store's cost center, and the store wins.

## Rolled up to 299 - Norms Support Center

One line for the whole estate, whatever locations the CSV spreads it across.

| CSV account | R365 account | Comment |
|---|---|---|
| 6050, every memo | `6050 - Health Care` | med/den/vis/dom part/acc/crit ill/hosp ind/life/whole life |
| 2265 | `2265 - Accrued Vacation` | vacation |
| 2267 PTO, PTO Paid Out | `2267 - Accrued PTO` | pto |
| 2270 | `2270 - Accrued Sick Pay` | sick |
| 2264 FSA Contribution, HSA Contribution | `2264 - Accrued FSA HSA Deductions` | fsa contributions |
| 2144 Child Support, TAX LEVY, State Tax Levy | `1030 - Restaurant Payroll-6821` | wage garnishments |
| 2142 401K Loan 1 | `2142 - 401(k) Loans` | 401k loan |
| 2140 401K, ROTH, ROTH$, 401(k) Roth | `2140 - 401(k) / Roth` | 401k / roth |
| 2120, 2122, 2124, 2126, 2128, 2130, 2132 | `1030 - Restaurant Payroll-6821` | total taxes |
| 1030 CHECKINGS, CHECKING, SAVINGS, Net Amount, NET PAY | `1030 - Restaurant Payroll-6821` | split below |

Memos arrive in mixed case and mixed spelling across locations, `Accident` beside `ACCIDENT` and `Medical Pre-tax` beside `Med Pre Tax`. Map on the account, so a new spelling lands correctly on its own.

## The 1030 cash split

The CSV's whole 1030 bucket equals the Stat Summary's **Total Net Pay Liability**, and the Stat Summary splits it:

```
direct deposits (checking / savings)  =  Subtotal Net Pay        (Checks + Direct Deposits)
the named void lines                  =  Adjustments/Prepay/Voids
```

Read the split from the Stat Summary rather than grouping the CSV memos. `Net Amount` and `NET PAY` look like manual checks and are not.

Each void gets its own line, commented `<check number> <Lastname, Firstname>`, matching `22338 Solis, Lizbeth`. Check numbers run on week to week. Reuse the previous week's void lines and rewrite their comments; zero any the week does not need, and add lines for any it needs beyond them.

## Lines the week does not use

The CSV drops an account entirely when a week has none of it. Mileage, cell phone, and the sign-on bonus each disappear and come back. **Any entry line with no CSV row behind it goes to 0.00**, which leaves the template slot for the week that needs it.

## Rounding

The CSV's tax sum runs a few cents under the Stat Summary's Total Taxes, and its ER tax sum under the Stat Summary's by the same amount, so an entry built entirely from the CSV balances. Use the CSV figures and record the difference in the tie-out.

Account `9999 Suspense` at dept `999` appears in some weeks. It carries no journal line and has to be disposed of deliberately, which is how the 8/29 entry acquired a 24.53 credit on `5320 - Payroll Taxes` at 211 and a 0.44 credit on `5300 - Healthcare` at 299.

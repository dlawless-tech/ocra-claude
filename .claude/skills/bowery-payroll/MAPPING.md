# The ADP General Ledger to the Bowery R365 payroll entries

Every rule here reproduces the approved 9/13/2026 entries: 477,368.47 across six locations, every amount-bearing line matching on account, side and amount. The only variances are the comment wording and the leftover zero lines named in [`SKILL.md`](SKILL.md).

## The import file

One CSV for the whole period, eleven columns:

```
JENumber,Type,Date,ReversalDate,JEComment,JELocation,Account,Debit,Credit,DetailLocation,DetailComment
Payroll,Standard,9/13/2026,,,400,100-03,,"68,989.43",400,NET PAYROLL
```

`JENumber` is `Payroll` and `Type` is `Standard` on **every** row. `Date` is the period ending. `JELocation` and `DetailLocation` both carry the entity's location number, `ReversalDate` and `JEComment` are empty, and amounts are written with thousands separators, which puts the larger ones in quotes.

Locations run in GL order, 400, 700, 500, 800, 200, 600, each block separated by **two empty rows**. R365 groups lines into one entry by JENumber, Date and location, so the separators are cosmetic and the JENumber is not: the 9/13 file left the Cookshop and Shukette blocks with an empty JENumber, and those are the two entries that had to be built another way.

## The entities

The GL's **Client ID** is the key. A client id with no row here stops the run.

| Client ID | GL Client Name | R365 location | Cash account |
|---|---|---|---|
| 154921 | 38 MACDOUGAL, LLC. | 400 Shuka | 100-03 |
| 154922 | 31 GREAT JONES RESTAURANT CORP | 700 Vic's | 100-08 |
| 155030 | SECOND STREET RESTAURANT LLC | 500 Rosie's | 100-07 |
| 155050 | BOWERY GROUP CORP | 800 Bowery Group | 100-20 |
| 155090 | 156 TENTH AVENUE RESTAURANT, LLC. | 200 Cookshop | 100-11 |
| 155093 | 230 NINTH AVENUE RESTAURANT LLC | 600 Shukette | 100-06 |

Read the cash account off the period's own `NET PAYROLL` rows rather than the table. The table records what it has been; the GL records what it is.

Bowery Group Corp runs no salary payroll, so it appears in the hourly GL only.

## One GL row, one entry line

The GL is already an R365 chart of accounts. Each row becomes one line: **GL Account Number** is the account, **Debit Amount** and **Credit Amount** the columns, **GL Account Name** the comment, and the location is the entity's, on both the header and every line.

Four rules override that.

**The account remap.** ADP codes maintenance wages to `620-20`. R365 carries that expense at `600-20`. No other account is remapped.

**`145-00 - Net Payroll - Transit` always posts to location 800**, Bowery Group Corp, whichever entity the transit was withheld from. The entry header stays on the entity, so only the line's `DetailLocation` moves. R365 relocates the line itself on save, so an entry that leaves it on the entity looks right until it is read back.

**Net payroll taxes combine.** The hourly and the salary `NET PAYROLL TAXES` hit the same cash account with the same comment, so they ride one line, at the position the hourly run gave it.

**Net payroll combines and splits into its live checks**, below.

Everything else stays as the GL wrote it, including rows that repeat an account within a period: `610-01` arrives four or five times per entity, once per tax, and each keeps its own line and its own comment.

## The cash split

**One direct deposit line per pay run**, hourly and salary each getting their own:

```
net payroll to post = NET PAYROLL + PARTIAL DIRECT DEPOSITS - the run's live checks
```

A partial direct deposit is a direct deposit, and a live check is drawn against the pair rather than against either one, so the two GL rows combine. That one line carries the comment `NET PAYROLL`. Each live check then gets its own credit line on the same cash account, commented with the **check number alone**, matching `48537`. Bank reconciliation is what wants them separate, so an entry that lumps them balances and still fails its purpose.

The live checks come from the **Net Pay Report** inside the entity's reports zip, read through `pdftotext -table`. `-layout` shifts the amount column down one row on these reports, silently pairing every check number with its neighbour's amount. The report's own `TOTAL TRANSACTIONS` line states the count and total, and the parse has to match both.

**A salary run can carry live checks too.** Rosie's 9/13 salary run carried two. A run with no Net Pay Report in its zip has none.

### Agency checks

A check written to an agency rather than an employee, printed as `NYS ASSESSMENT RECEIVAB` or a child support payee, already has its own GL row on the cash account: `EMPLOYEE GARNISHMENTS`, `CHILD SUPPORT/GARNISHMENTS`. It sits **outside** net payroll, so it keeps that row and must not also become a check line. Vic's 9/13 Net Pay Report listed 16 checks; 15 of them belong to net payroll and check 48545 is the 105.84 garnishment.

The builder matches an agency check to its GL row by amount. The proof it got it right is that net payroll less the remaining checks comes out non-negative and the entry ties to the GL total.

### The tie-out

The entity's **Cash Requirement** report states the split directly, and it is the check on the arithmetic:

| Cash Requirement | Entry |
|---|---|
| Checks | the check lines, summed |
| Partial DD + Net DD | the `NET PAYROLL` line |
| the three summed | GL `NET PAYROLL` + `PARTIAL DIRECT DEPOSITS` |

## Accounts a period does not use

The GL drops an account entirely when a period has none of it. Bonus, paid time off, FUI, SUI, transit, and due-from-employees each disappear and come back. Build the entry from the GL's rows rather than from the prior period's line list, and a period without one simply has no line for it.

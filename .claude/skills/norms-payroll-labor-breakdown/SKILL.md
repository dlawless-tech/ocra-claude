---
name: norms-payroll-labor-breakdown
description: Split the hourly labor on a NORMS Restaurant365 payroll journal entry into 5241 FOH Hourly and 5242 BOH Hourly by store, from the ADP PAY DETAILS LG file. Use when asked to break out, split, or reclass NORMS payroll hourly labor into FOH and BOH, or when an entry still carries 5212 Store Labor (Hourly) lines.
---

# FOH / BOH hourly breakout on the NORMS payroll entry

Each store's hourly labor on the weekly `Payroll` entry sits on two lines, `5241 - FOH Hourly` and `5242 - BOH Hourly`, split by job GL from the pay details file. Location 370 is the exception: all its labor sits on one `6025 - Salary-Hourly` line.

`norms-payroll` posts the weekly amounts straight onto those lines, reading the key from `scripts/pay-details.js` here. This skill restructures an entry: it converts one still carrying `5212 - Store Labor (Hourly)` lines, adds a missing FOH line, and folds 370's hourly into `6025`. Each store's labor total and the entry total stay unchanged.

The user supplies the file, named like `NORMS - PAY DETAILS LG ... .xlsx`. Column B reads `<location>.<job GL>`: the first three digits are the R365 location number, the four after the dot the job GL.

## The key

`scripts/pay-details.js` holds the job GL key and is its single source of truth for both skills. FOH is 5265, 5270, 5275, 5280, 5285, 6020. BOH is 4085, 5245, 5250, 5251, 5255, 5260, 5800. Salary is 5215, 5220, 5230, which post to `5210 - Store Labor (Salary)` and stay out of the split.

A job GL missing from the key with money on it fails the build. Ask the user which side it belongs on, then add it to the key. One with only zeros is skipped.

The hourly figure is **Regular + Overtime + Double Time + Meal Penalty** earnings. Sick and PTO earnings sit on the accrued `2270` and `2267` lines and stay out.

Excel stores column B as a number, so `222.5250` arrives as `222.525`. The loader pads the job GL back to four digits; a hand-built split misreads those rows.

## Steps

Scripts live in `scripts/`. Keep one working directory for the whole run, since `playwright-cli` sessions bind to it.

1. **Log in.** `scripts/r365-login.sh <session>` reads `~/.claude/norms-credentials.md` and is idempotent.
2. **Convert the file.** `scripts/xlsx-to-csv.js <file.xlsx> > detail.csv`.
3. **Open the entry.** Soft-navigate to All Transactions, find the Unapproved `Payroll` row with the requested date in the grid's data source, and fire its Number cell. [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) covers the soft navigation, the iframe walk, and firing the cell. Read it before scripting R365. The entry opens in a second tab.
4. **Dump and build.** `scripts/dump-lines.sh <session> lines.json`, then `scripts/build-split.js detail.csv lines.json > plan.json`. Done when every store prints its split and nothing prints FAIL.
5. **Apply.** `scripts/apply-split.sh <session> plan.json`. Done when it reports an empty `log` and a `removed` line for every planned delete.
6. **Check before saving.** Dump again and rerun the builder on the new dump: the plan comes back with no repoints, adds, or removes, and every set amount already on its line. Debits equal credits and match the entry total from the All Transactions grid.
7. **Save** through the Save submenu and read the `SaveTransaction` response body, per the automation doc. A committed save reads `[["1","<transaction id>"," "],...]`.
8. **Verify from the server.** Close the entry tab, fire the Number cell again, dump, and repeat the step 6 check on the reopened entry. A delete that never reached the save shows here as a line still present and the entry out of balance.

Leave the entry Unapproved unless the user asks for approval.

## The reconcile gate

The builder refuses to plan unless each store's file total (FOH + BOH) equals its hourly lines to the cent. When that holds, the split is right by construction. On the 9/12/2026 entry every store matched.

- **370 Select Industries** carries only Drivers (4085), whose pay runs partly through `6025`. The builder moves the whole hourly line onto `6025` and deletes it; the file total for 370 is 6025's hourly plus salary together.
- **298** carries salary only, and its salary posts on the 299 line. It has no hourly line and nothing to split.
- A store in the file with hourly money and no hourly line fails the build. Read the entry before adding one.

## Reruns

The builder reads the entry's current state, so it resumes an interrupted run. A store whose `5212` line is still there reconciles against that line alone; a store already split reconciles against its `5241` + `5242` lines and only has its amounts updated.

## How the automation works

- **Repoint** in place with `m.set('glAccountId', guid)` and `m.set('glAccount', label)`. The guids for 5241 and 5242 are in `apply-split.sh`.
- **Add** through the new-row form's own handler: set `newRowForm.GLAccountsKendoDropDownList.value(guid)` and trigger `change`, set `newRowForm.model.debit` and `comment` inside `$apply`, then call `newRowForm.addRowToGrid()`. This skips the combobox keystroke dance entirely.
- The added row lands at the form's default location, 299. Move it by copying `locationId` and `location` from that store's BOH line. A stray FOH line at 299 means a move failed.
- **Delete** with a real `playwright-cli click` on the row's `.k-grid-delete` icon, addressed as `tr[data-uid="<uid>"] .k-grid-delete`. `dataSource.remove()` drops the row from the grid and the save leaves it on the server, which on 9/12 left the entry out of balance by the removed amount.

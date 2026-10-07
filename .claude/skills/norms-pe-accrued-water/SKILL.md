---
name: norms-pe-accrued-water
description: Period-end cleanup of NORMS Restaurant365 2285 Accrued Water by store. Relieve each water bill to the store's accrual balance with the difference to 5635 Utilities Water, true up each store's balance to unbilled water through period end, and reset the weekly Accrued Water amounts to the bills. Use when asked to run, review, or fix the NORMS water accrual, to run the 2285 GL detail by location, or to adjust NORMS weekly Accrued Water entries or templates.
---

# NORMS period-end Accrued Water

At **period end (PE)**, every store's 2285 balance should equal the water it used through PE that no bill has charged yet. Three moves get it there, in this order: **relieve** the period's bills, **true up** the PE balance, **reset** the weekly rate.

A NORMS period ends on a Saturday (P10'26 ran 9/6 through 10/3/2026). The weekly entries and every date below follow the operational calendar.

Session and conventions:

```bash
../norms-grubhub/scripts/r365-login.sh r365
```

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting. Run the scripts from a scratch folder (`.scratch/water/`); they drop working files in the current directory. Every script below lives in `scripts/` here.

## The accounts and entries

- **2285 Accrued Water**, by store. **5635 Utilities Water** is store expense; **6335 Water-Corp** is Support Center's.
- **Weekly entries**, numbered `Accrued Water`, one per store, dated each Saturday: Dr 5635 / Cr 2285 at the store. They generate from memorized templates that list on All Transactions as Unapproved rows named `Template: <nnn - Store>:Accrued Water`. Those rows are the templates. Edit them, never delete them. Hollywood's is named `Template: Accrued Water`.
- **Bills** are AP invoices coded to 2285 at the store, sometimes split with 5635. LADWP bills for Hollywood, La Cienega, Van Nuys and Riverside are combined electric and water: a 2281 line plus a 2285 line. The 2285 amount is the water, even when the vendor name says ELECTRIC.

## Step 1: the GL

Pull both accounts by location, from three periods before PE through today, so the rate step has three bills per store:

```bash
bash scripts/gl-detail.sh r365 2285 6/14/2026 10/7/2026 g2285.txt
bash scripts/gl-detail.sh r365 5635 6/14/2026 10/7/2026 g5635.txt
node scripts/rows.js g2285.txt > r2285.json
node scripts/rows.js g5635.txt > r5635.json
```

`gl-detail.sh` runs GL Account Detail with Subtotal By Location and Show Unapproved Yes. **Done when** each rows file's net (cr minus dr) matches the report's Grand Total balance and every row carries an `id`. `node scripts/bills.js r2285.json r5635.json [Store]` lists each bill with its full water amount and service period.

## Step 2: relieve the period's bills

Each water bill dated in the period takes the store's 2285 balance at that moment, and the rest goes to 5635. A bill bigger than the accrual means the store was under-accrued, so 5635 gets the shortfall. A smaller bill sends a negative 5635 amount and releases the excess.

```bash
node scripts/relieve-plan.js r2285.json r5635.json <prior PE> "<skip stores>" > relieve.json
```

The plan walks each store from its balance at the prior PE: weekly entries build it, a bill date zeroes it, and bills sharing a date split the balance in proportion to their amounts. Read the table it prints, then show the human the bills where 2285 changes before posting.

Leave these bills as they are, through the skip list or by dropping them from the plan:

- **A bill for an older service period** than the days the accrual covers. Slauson's 9/10/2026 bill covered 6/23 through 8/27, while its accrual held 8/27 through 9/5; relieving it would have wiped an accrual that a later bill still needs.
- **A credit**, such as a refund or a "To Be Applied" amount. Claremont's 9/5/2026 credit of 2,470.92 stayed out of both the accrual and the rate.
- **A bill dated on or before the prior PE.** That period is closed in R365.

Post each one:

```bash
node -e 'for(const i of require("./relieve.json"))if(i.change)console.log([i.id,i.loc,i.new2285.toFixed(2),i.new5635.toFixed(2),i.tot.toFixed(2)].join("\t"))' > relieve.tsv
while IFS=$'\t' read -r ID L A B T; do bash scripts/relieve-invoice.sh r365 "$ID" "$L" "$A" "$B" "$T" </dev/null; done < relieve.tsv
```

Approved bills are edited in place (Edit, then Edit Complete) and stay Approved; the human has cleared editing approved and paid bills in an open period. **Done when** every line prints OK and the bill total is unchanged.

## Step 3: true up the PE balance

Re-pull 2285 (Step 1) so the balances include the relief. For each store, set the **target**: water used from the end of its last billed service period through PE.

- When a later bill covers PE, prorate it by days: `bill x days through PE / days in its period`. Anaheim's 9/23/2026 bill for 8/19 through 9/18 (30 days, 709.71) put 17 days, 402.17, into the 9/5 target.
- Otherwise estimate at the store's last bill's daily rate. The human accepts estimates; they are all there is for bimonthly stores (El Monte, Orange, Santa Ana, Costa Mesa) until the next bill lands.
- A store with several meters (Claremont, Inglewood, Pico Rivera, West Covina) gets one target per meter, summed.

Write `targets.json` as `{"217 - Anaheim": {"tgt": 720.58, "basis": "9/23 bills prorated"}, ...}` and show the human the table before posting:

```bash
node scripts/trueup-plan.js r2285.json <PE> targets.json > trueup.json
bash scripts/trueup-entry.sh r365 <source JE id> <PE> "P<n>'<yy> Water Accrual True Up" trueup.json "True up to unbilled water thru <PE>"
```

The source can be any JE; the script copies it and rewrites every line. It saves the entry Unapproved and checks each line after a reload. Approve once the human has reviewed it, with `approve` from `../norms-grubhub/scripts/lib.sh`. `trueup-entry.sh` and `je-lines.js` have not run end to end; the one-off 9/6/2026 reclass that proved the grid technique was built by hand.

## Step 4: reset the weekly rate

For each store, rate = **average daily water over its last three billed periods x 7**, rounded to whole dollars. Use full bill amounts (2285 plus 5635) from `bills.js` and day counts from each service period. Reset any store more than about 5% below its rate. A store over its rate is caught by the next true-up; raise it with the human rather than lowering it on your own.

The weekly entries for future Saturdays come from the templates:

```bash
bash scripts/edit-template.sh r365 "<Store>" <template id> <new>
```

Find template and entry ids on All Transactions: soft navigate there, then run `scripts/list-entries.js` with `__Q__` replaced by `Accrued Water`. It prints date, number, name, location, status, amount, type and id per row.

Edit already-posted weekly entries only when the human asks; the true-up already carries their shortfall. Then:

```bash
bash scripts/edit-weekly.sh r365 <YYYY-MM-DD> "<Store>" <entry id> <old> <new>
```

A store with no weekly entries gets them from a copy of another store's approved weekly entry, one Saturday at a time, then a template memorized from the last one (Action > Memorize, name `Accrued Water`, Auto-Recurrence **Weekly**):

```bash
bash scripts/new-weekly.sh r365 <source entry id> "269 - Hollywood" 10/10/2026 1131
```

## R365 behavior

- **JE grid edits.** Changing an existing row through `model.set`, including its account and location, saves. Rows added with `dataSource.add` or dropped with `dataSource.remove` are silently lost on save. Add a row through the new-row form (`newRowForm.addRowToGrid()`) and drop one with its trash icon (`.k-grid-delete`); `je-lines.js` does both.
- **Duplicate** sometimes asks about attachments ("No, transaction only") and sometimes opens the copy without asking. Either way the copy opens in tab 1, already saved with an NJ number and dated today. A run that fails after the copy leaves that NJ entry Unapproved: delete it (Action > Delete, then Yes).
- **Closed date.** The location setup shows Hollywood and La Cienega closed as of 9/5/2026. Both stores are open, and entries post to them normally.
- **Support Center.** Until 9/6/2026 the go-live balance (6/13) and the P7 and P8 accruals sat in one lump on Support Center while the bills relieved the stores. The 9/6/2026 entry `Reclass Water Accrual to Stores` moved it out. Support Center now carries only its own Bellflower accounts, 132 a week.

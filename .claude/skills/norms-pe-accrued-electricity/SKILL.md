---
name: norms-pe-accrued-electricity
description: Period-end cleanup of NORMS Restaurant365 2281 Accrued Electricity by store. Relieve each electric bill to the store's accrual balance with the difference to 5630 Utilities Electric, true up each store's balance to unbilled electricity through period end, and reset the weekly Accrued Electricity amounts to the bills. Use when asked to run, review, or fix the NORMS electricity accrual, to run the 2281 GL detail by location, or to adjust NORMS weekly Accrued Electricity entries or templates.
---

# NORMS period-end Accrued Electricity

This runs the same three moves as the water accrual: **relieve** the period's bills, **true up** the PE balance, **reset** the weekly rate. [`../norms-pe-accrued-water/SKILL.md`](../norms-pe-accrued-water/SKILL.md) holds the steps, the rules for each move and the R365 behavior. Read it first and run its steps with these swaps:

- Prefix every script with `UTIL=electric`, from a scratch folder `.scratch/elec-pe/`. The scripts live in `../norms-pe-accrued-water/scripts/`.
- **2281 Accrued Electricity** replaces 2285, **5630 Utilities Electric** replaces 5635, and **6330 Electric-corp** replaces 6335 for Support Center.
- Weekly entries and templates are numbered `Accrued Electricity`. Templates list as `Template: <nnn - Store>:Accrued Electricity`.

```bash
UTIL=electric bash $W/gl-detail.sh r365 2281 6/14/2026 <today> g2281.txt
UTIL=electric bash $W/gl-detail.sh r365 5630 6/14/2026 <today> g5630.txt
node $W/rows.js g2281.txt > r2281.json; node $W/rows.js g5630.txt > r5630.json
UTIL=electric node $W/bills.js r2281.json r5630.json
```

`W=../../.claude/skills/norms-pe-accrued-water/scripts` from the scratch folder. On 10/15/2026 the pull from 6/14 tied to the report: 2281 ended at -16,616.85 and 5630 at 2,149,965.02.

## Step 0: reclass the Support Center lump (first run only)

Until it is reclassed, Support Center's 2281 holds a lump: the 6/13 go-live balance of 119,065.50 plus the P7 accrual of 18,782.42, about 131K at 10/3/2026. Every store sits negative, because their bills relieve the stores while the accruals sat on Support Center. Relief and the true-up need real store balances, so move the lump first. Water made the same move on 9/6/2026 with `Reclass Water Accrual to Stores`.

Date the reclass the first day of the period being closed, and set each location's target to its unbilled electricity through the prior PE. That covers Support Center too, whose own target stays with it. Use the Step 3 target rules from the water skill, with every location listed in `targets0.json`:

```bash
UTIL=electric node $W/reclass-plan.js r2281.json <first day> targets0.json > reclass.json
UTIL=electric bash $W/trueup-entry.sh r365 <source JE id> <first day> "Reclass Electric Accrual to Stores" reclass.json "Move Support Center accrual to stores, unbilled thru <prior PE>"
```

The plan moves 2281 between locations, and the gap between what Support Center releases and what the stores need goes to store 5630 pro rata to each store's move. Show the human the table before posting. Once this entry exists, later runs skip this step: check All Transactions for `Reclass Electric Accrual` before starting.

It ran on 10/15/2026, dated 9/6/2026 and built from the water reclass as source: 49 lines, 272,133.87. Support Center released 130,032.93. Stores needed 142,100.94 more than that, because P8 and P9 were never accrued, and that gap went to 5630. Leave Unapproved entries out of the balances (drop their rows from the rows file); the Support Center 9/5 entry of 936.96 was dropped this way.

## Where electricity differs

- **Locations.** 25 carry 2281: the 23 water stores plus Carson and Las Vegas. Support Center has no weekly template; its weekly entries were posted by hand.
- **Spread entries.** Several 2281 bills before P10 were spread daily by R365 (`Spread for AP Invoice` JEs, numbered NJ000xxxxx), then reversed on the last day (`Spread Reversal`). Each spread and its reversal net to zero in 2281, so leave them alone.
- **Combined bills.** Hollywood, La Cienega and Van Nuys (LADWP) and Riverside (Riverside Public Utilities) bills carry a 2281 line beside the 2285 water line, even when the vendor name says WATER. Only the 2281 and 5630 lines are electricity.
- **Multiple meters.** Slauson (0946 and 4995) and Santa Ana (0535 and a 46.61 monthly 0606 meter) each get one target per meter, summed.
- **Rate basis.** The weekly rates set on 10/7/2026 came from the P7 through P9 GL average (63,060 a week across the stores), by the human's choice at the time. This skill resets to the water rule, the last three bills' daily average x 7. Confirm the switch with the human on the first run, before editing templates.
- **Open item.** An Unapproved Support Center `Accrued Electricity` entry dated 9/5/2026 for 936.96 stays as is, by the human's call.

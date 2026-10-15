---
name: norms-pe-accrued-electricity
description: Period-end review of NORMS Restaurant365 electricity expense by store. Compare the closing period's 5630 Utilities Electric (6330 for Support Center) to the prior three periods and accrue any shortfall to 2281 Accrued Electricity. Use when asked to run, review, or fix the NORMS electricity accrual, to compare NORMS electric expense to history, or to adjust NORMS weekly Accrued Electricity entries or templates.
---

# NORMS period-end Accrued Electricity

At **period end (PE)**, each location's electric expense for the period should look like its history. Prior periods are closed, and the human treats their expense as right. The review compares the closing period to the average of the three periods before it and accrues any shortfall. Electricity runs on **history**, unlike water, which trues up to the bills: the human chose that on 10/15/2026.

A NORMS period is 28 days ending on a Saturday (P10'26 ran 9/6 through 10/3/2026).

Session, conventions and R365 behavior are the water skill's: read [`../norms-pe-accrued-water/SKILL.md`](../norms-pe-accrued-water/SKILL.md) (its sections "R365 behavior" and the session block) and [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md). The shared scripts live in `../norms-pe-accrued-water/scripts/` and take `UTIL=electric`. Work from `.scratch/elec-pe/`, with `W=../../.claude/skills/norms-pe-accrued-water/scripts` and `E=../../.claude/skills/norms-pe-accrued-electricity/scripts`.

## The accounts and entries

- **2281 Accrued Electricity**, by location. **5630 Utilities Electric** is store expense; **6330 Electric-corp** is Support Center's.
- **Weekly entries**, numbered `Accrued Electricity`, one per location, dated each Saturday: Dr 5630 / Cr 2281. They generate from 25 memorized templates listed as Unapproved rows named `Template: <nnn - Store>:Accrued Electricity`. Those rows are the templates. Edit them, never delete them. The rates come from the P7 through P9 GL average (63,060 a week across the stores, set 10/7/2026).
- **Support Center** got its template on 10/15/2026, memorized Weekly at 885 (Dr 6330) from its 10/10 entry. Before that only its 9/12 week was posted, which is why P10 needed an accrual.
- **Bills** debit 2281 at the store in full from P10 on. They do not touch expense, so period expense equals the weekly entries plus any accrual from this review.
- **Locations:** 25 carry 2281, the 23 water locations plus Carson and Las Vegas.

## Step 1: the GL

Pull four periods: the closing period and the three before it.

```bash
UTIL=electric bash $W/gl-detail.sh r365 5630 <first day, 3 periods back> <PE> g5630.txt
UTIL=electric bash $W/gl-detail.sh r365 6330 <first day, 3 periods back> <PE> g6330.txt
node $W/rows.js g5630.txt > r5630.json; node $W/rows.js g6330.txt > r6330.json
```

**Done when** each rows file's net matches the report's Grand Total balance.

## Step 2: compare the period to history

```bash
node $E/period-compare.js r5630.json r6330.json <first day, 3 periods back> > compare.json
```

The last column is the closing period less the prior-three average. Read each line that is more than a few dollars off and name its cause before accruing:

- **A one-off entry** dated in the period moves expense between locations and nets to zero. Leave it. P10's case: the 6,293.24 P7 accrual reclass from Riverside to Downey, dated 9/6/2026 (Downey +6,295, Riverside −6,292).
- **Missing weekly entries** leave a location short. Accrue the shortfall in Step 3. P10's case: Support Center, 885 booked against a 3,538.47 average.
- **A location over its average** stays as booked. Raise it with the human; lowering expense is the human's call.

Show the human the table and the causes. **Done when** every line off by more than a few dollars has a named cause.

## Step 3: accrue the shortfall

Write `accrual.json` with one pair per short location: Dr 5630 (6330 for Support Center) / Cr 2281, both at the location, for the average less booked. Build it from any 2-line JE:

```bash
UTIL=electric bash $W/trueup-entry.sh r365 <source JE id> <PE> "P<n>'<yy> Electric Accrual True Up" accrual.json "<location> to P<a>-P<c> avg"
```

It saves Unapproved and checks each line after a reload. Approve once the human has seen the table, with `approve` from `../norms-grubhub/scripts/lib.sh`. P10 posted 2,653.47 for Support Center on 10/3/2026, approved; its source was Support Center's 9/12 weekly entry (d299d936-8273-44b6-bdfd-bc08d15e68d7).

## Step 4: weekly rates

Rates stay on the GL average. Change a template only when the human asks, with `UTIL=electric bash $W/edit-template.sh`. Find template ids on All Transactions with `$W/list-entries.js` and `__Q__` set to `Accrued Electricity`.

Close the browser session this run opened, by name.

## History

- **Reclass of the Support Center lump**, `Reclass Electric Accrual to Stores`, dated 9/6/2026, approved. Support Center's 2281 held the 119,065.50 go-live balance plus the 18,782.42 P7 accrual while the stores' bills relieved the stores. The entry spread 130,032.93 from Support Center to the stores pro rata to each store's unbilled electricity through 9/5, on 2281 only (25 lines; `$W/reclass-plan.js ... spread`). Support Center kept 4,606.50. Bills prorated to 9/5 called for 142,100.94 more at the stores; the human kept prior periods as booked, so it was not expensed.
- **Unapproved entry left as is:** Support Center `Accrued Electricity`, 9/5/2026, 936.96, by the human's call. The GL pull includes it, so it counts in P9's average.
- **2281 balances** drift as bills and accruals differ, since bills no longer relieve to the accrual. The human focuses on period expense; raise the balance sheet only when asked.

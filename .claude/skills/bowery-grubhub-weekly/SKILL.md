---
name: bowery-grubhub-weekly
description: Scheduled run of the Bowery Grubhub reconciliation for the latest settled period, all four stores, no human on hand.
disable-model-invocation: true
---

Run the `/bowery-grubhub` skill for all four stores, for the period picked below. Nobody is watching, so follow its rules with the changes listed here.

## Pick the period

The target is the latest Tuesday to Monday period whose Monday is at least two days before today, so its Wednesday deposit has landed. Work it out from `date` in `America/New_York`:

- Run on a Thursday 9/24: the period is 9/15 through 9/21, the entry date 9/20, the GL window 9/15 through 9/21.
- Run on a Tuesday 9/29: still 9/15 through 9/21, since 9/22 through 9/28 has not settled.

State the period, entry date, and GL window at the top of the report before touching any browser.

## Unattended changes

- **Skip what is done.** Before posting a store, check its entry for the period in the All Transactions grid. An entry already **Approved** with a nonzero amount is left alone and reported as already posted. This makes a re-run safe.
- **No hand-offs.** Where the skill says to hand the keyboard over or let the human click Save, stop that store instead, leave its entry unapproved, and carry on with the rest. A Grubhub mailed code or a rejected login stops the whole run.
- **Dollar differences.** Post with the plug as the skill says, and name the cause per store in the report.

## Finish

Close only the Bowery sessions. Write the report to `.scratch/bgh<MMDD>/report.md`, where MMDD is the entry date, and end with the same table: store, deposit ID, net deposit, fees, difference, status (posted, already posted, no deposit, failed and why).

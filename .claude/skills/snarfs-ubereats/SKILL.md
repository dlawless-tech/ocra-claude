---
name: snarfs-ubereats
description: Post the weekly UberEats journal entries into Snarf's Sandwiches Restaurant365 (snarfsstl), one per store, clearing 10135 UberEats Receivable against 70460 UberEats Fees and 42060 Customer Refund from Uber's pay period for the Monday-to-Sunday week, with the Uber pay period page attached to each. Use when asked to post, balance, review, or approve the Snarf's Uber Eats entries in R365, to check Snarf's 10135 against Uber, or when the Tuesday scheduled run starts it.
---

# Snarf's Uber Eats, weekly by store

Same shape as [`../snarfs-doordash`](../snarfs-doordash/SKILL.md): the week runs **Monday to Sunday**, the entry is dated the **Sunday**, and the 10135 credit is the week's DSS Uber sales (**D**) less Uber's net payout. Uber pays **weekly**: one payout per store per week, deposited the Tuesday after.

**The account ties when each Sunday's 10135 balance equals the Uber deposit booked the next Monday to Friday.** Read the books approved only: `gl/gl-detail.sh` defaults to Show Unapproved No.

Work from one fixed scratch folder, `.scratch/snarfs-ubereats/wk<MMDD of the Sunday>`, since `playwright-cli` binds sessions to the folder. Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for R365 grid habits. `<scripts>` is this skill's `scripts/` folder, written absolute.

## Stores

| R365 location | Uber store |
|---|---|
| 10100 Snarf's Sandwiches 1 - MX | Snarf's Sandwiches (MX), 614 Washington Ave |
| 10400 Snarf's Sandwiches 2 - SLU | Snarf's Sandwiches (SLU), 374 S Grand Blvd |
| 10300 Snarf's Sandwiches 3 - Skinker | Snarf's Sandwiches (Skinker), 360 N Skinker Blvd |
| 10200 Snarf's Sandwiches 4 - Page | Snarf's Sandwiches (Maryland Heights), 11512 Page Service Dr |
| 10700 Snarf's Sandwiches 5 - Fenton | Snarf's Sandwiches (Fenton), 870 South Highway Dr |
| 10800 Snarf's Sandwiches 6 - Kirkwood | Snarf's Sandwiches (Kirkwood), 10935 Manchester Rd |
| 10900 Snarf's Sandwiches 7 - Spirit | Snarf's Sandwiches (Chesterfield), 17726 Chesterfield Airport Rd |

Spirit's first Uber pay period ran 5/1 to 6/21/2026; D always runs over Uber's own period dates.

## Logins

```bash
bash <scripts>/r365-login.sh snu     # R365, tlaroche, ~/.claude/snarfs-credentials.md
bash <scripts>/uber-login.sh sub     # Uber Eats Manager, mark+04, saved profile ~/.claude/playwright-profiles/snarfs-ubereats
```

Uber mails a 4-digit code to mark+04. `uber-login.sh` fills the email and waits `WAIT` minutes (default 60) for the human to type the code into the open window; `NOTIFY=1` tags Tricia in Teams first. One Uber session serves the whole run, since each new session costs another code. R365 allows one tlaroche session at a time; another Snarf's run logs this one out mid-step. Rerun `r365-login.sh`, read the entry back, and retry the step.

## Reading Uber

`uber-pull.sh` picks each store in the page's store picker, then calls Uber's own `listPayoutsHistory` (pay periods with net payout and status) and `getEarningsBreakdown` (Gross Sales, Marketing, Uber Fees, Amendments) for each period. Both calls answer for the store currently picked, whatever store id the body carries, so the pick comes first. The date range filters on the **deposit date**: run it through today, or the latest week drops out.

## The entry

One `UberEats` entry per store per Sunday, an Approved template at 0.00. Lines vary a little by store; `post-entry.sh` finds each by account and comment:

| Line | Account | Amount |
|---|---|---|
| AR less expected deposit (Spirit: GL Balance - Payout) | 10135 | credit `ar = D - net` |
| marketing | 70460 | `mkt` = Uber Marketing total, shown positive |
| uber fees | 70460 | `fees` = Uber Fees total, shown positive |
| net order error adjustments, where present | 70460 | 0.00 |
| refund / refunds / customer refund / Net Chargeback Amount | 42060 | `refund` = Uber Amendments, debit when Uber shows it negative |
| discrepancy / Variance | 42060 | `diff = D - Uber Sales (incl. tax)`, debit if positive |

`ar = mkt + fees + refund + diff`. This reproduces every 10/11/2026 entry the preparer posted, line for line. Older entries split tax on offers and chargebacks between lines differently; their 10135 credit is the same, so leave them.

The discrepancy normally runs a few dollars, rarely past 30. `plan.js` warns past 50 and fails the store past 10% of Uber's sales, which is what a missing or doubled sales day looks like.

## Steps

1. **Uber.** `bash <scripts>/uber-pull.sh sub <Monday, two weeks back, YYYY-MM-DD> <today YYYY-MM-DD> uber.json`. `STORE=<tag>` keeps one store.
2. **GL.** `bash <scripts>/gl/gl-detail.sh snu <Monday, two weeks back, M/D/YYYY> <today M/D/YYYY> gl.csv`, then `node <scripts>/gl-parse.js gl.csv gl.json`.
3. **Plan.** `node <scripts>/plan.js uber.json gl.json <Sunday M/D/YYYY> > plan.json`. Per store: `D, sales, net, ar, mkt, fees, refund, diff`, the period and settlement, `warnings`, and `fail` when Uber's period is missing or not settled, its sections do not add to the payout, or the discrepancy is too large. It also checks the prior Sunday's balance against the deposit since booked; a miss there is a deposit not yet in R365 (SLU's 10/13/2026 2,038.46) or a wrong prior entry.
4. **Find the entries.** `bash <scripts>/find-entries.sh snu <Sunday M/D/YYYY>` prints `location|TransactionId|status|amount|attachment`.
5. **Post** each store: `bash <scripts>/post-entry.sh snu <TransactionId> plan.json <store>`. It unapproves, prints the lines the entry held, sets every line, checks the sides balance, saves, reloads and reads back, then prints `SAVED <id> <total>` and exits 0. Approve with `bash <scripts>/approve.sh snu <id>...` only after that exit; chain with `&&` directly, since a pipe swallows the failure.
6. **Backup.** `bash <scripts>/capture-backup.sh sub plan.json <store> att/<store>` saves `<M.D.YY> Snarfs <store> Ubereats.png`, the full Uber pay period page, after checking its Total payout against the plan. A payout that moved means Uber added late orders: rerun steps 1, 3 and 5 for that store. Then `bash <scripts>/attach.sh snu <id> att/<store>`, which adds the file and reads the titles back.
7. **Tie-out.** `node <scripts>/tie.js gl.json <Sunday two weeks back>` lists every Sunday whose balance misses the next week's deposits. The current Sunday's deposit lands Tuesday and may not be in R365 yet.
8. **Verify** with `find-entries.sh`: every row Approved at the planned total with the backup in `attachment`.

Close the sessions by name at the end (`playwright-cli -s=snu close`, `-s=sub close`).

## Reviewing past entries

Pull Uber and the 10135 GL over the period through today, run `tie.js`, and compare each entry's 10135 credit with `D - net` from `plan.js` for its Sunday. Report the weeks that miss before correcting; correct an approved entry only when the human says so, with `post-entry.sh` and a JSON of just the lines to change, e.g. `'{"ar":412.94,"diff":0.23}'`.

## Unattended run

`<scripts>/tuesday-run.ps1` runs from Task Scheduler on Tuesdays at 13:00 (`<scripts>/register-task.ps1` sets it up). It covers the week that ended the Sunday before and writes `started.txt` in the work directory first, so a week runs once; `-Force` reruns it and `-Date yyyy-MM-dd` stands in for today.

The wrapper `cd`s into the work directory and logs in Uber session `subu` with `NOTIFY=1`, which tags Tricia in the Snarf's TPD channel when a code is needed and waits 60 minutes. No code fails the run with a card to Tricia and posts nothing. Then it starts this skill headless with a prompt beginning `Unattended run`, naming the week, the work directory and the entry date.

No human answers during the run, so:

- Run every command from the work directory. Use `subu` (Uber, already logged in) and `snuu` (R365). Never open a second Uber session.
- A store with `fail` in the plan is `held`, posted nothing, with the reason in `warnings`.
- An entry already carrying amounts is `skipped`. Every plan warning, and a backup that does not capture or attach, goes in `warnings`; the store still posts.
- Approve only after `post-entry.sh` prints SAVED. A store that fails a step is `failed`, with the step in `warnings`, and the others carry on.
- Never correct an approved prior entry; report a tie-out miss in `note`.

Finish with steps 6 to 8, close `subu` and `snuu`, then write `result.json` in the work directory. The wrapper posts it to the TPD channel through `<scripts>/notify-teams.ps1`, tagging Collin Heyerdahl; a run that ends without `result.json` tags Tricia instead:

```json
{ "period": "10/5/2026 - 10/11/2026", "entryDate": "10/11/2026", "note": "",
  "stores": [ { "store": "MX", "status": "approved", "amount": 212.66, "transactionId": "...", "backup": true, "warnings": [] } ] }
```

`status` is `approved`, `skipped`, `held` or `failed`; `amount` is the entry's total debits. The webhook lives in `~/.claude/snarfs-ubereats.json`, outside the repo: `{"teamsWebhook", "codeMention": {"name","email"}, "doneMention": {"name","email"}}`. `notify-teams.ps1 -DryRun` prints the card.

## History

Reviewed 10/15/2026 against Uber and the approved GL for every 2026 week: 259 of 263 credits equal `D - net`. Skinker 10/4 was over-credited 237.43 (discrepancy 237.66) and was rewritten to 412.94 and approved. Skinker 1/25 and 2/1 carry offsetting 0.03 differences, left as is. Spirit 6/21 is right: it clears Uber's first 5/1 to 6/21 period.

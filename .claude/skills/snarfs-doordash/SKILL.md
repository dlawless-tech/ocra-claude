---
name: snarfs-doordash
description: Post the weekly DoorDash journal entries into Snarf's Sandwiches Restaurant365 (snarfsstl), one per store, clearing 10130 Door Dash Receivable against 70400 DoorDash Fees and 42060 Customer Refund from DoorDash's payouts for the Monday-to-Sunday week, with a tie-out backup PDF attached to each. Use when asked to post, balance, review, or approve the Snarf's DoorDash entries in R365, to check Snarf's 10130 against DoorDash, or when the Thursday scheduled run starts it.
---

# Snarf's DoorDash, weekly by store

Same logic as [`../bowery-doordash`](../bowery-doordash/SKILL.md): the week runs **Monday to Sunday**, the entry is dated the **Sunday**, and the 10130 credit is the week's DSS DoorDash sales (**D**) less the week's net payouts. DoorDash pays **daily**, and the figures come from DoorDash's API.

**The account ties when each Sunday's 10130 balance equals the DoorDash deposits booked the next Monday to Friday.** That is the human's check, so the week's payouts are the ones due to deposit that Monday to Friday: each payout deposits the next weekday after its payout date (Friday's payout lands Monday). A bank holiday that delays a deposit past Friday leaves the payout in its week (Juneteenth 2026: the 6/14 balance holds the deposit that landed 6/22). A payout that straddles Sunday and Monday is paid Friday and deposits the following Monday, so it belongs to the next week.

**Read the books approved only.** An unapproved entry is outside the human's GL. `gl/gl-detail.sh` defaults to Show Unapproved No; `UNAPPROVED=yes` adds them. Skinker's unapproved NJ00047545 (8/4/2026, DoorDash 1,717.60 twice) once got plugged into a fee entry because a GL was read with unapproved items. It is a debit-only leftover of the 8/4 DSS import and opens read-only, with no Delete; it stays out of the approved books.

Work from one fixed scratch folder, `.scratch/snarfs-doordash/wk<MMDD>`, since `playwright-cli` binds sessions to the folder. Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for R365 grid habits. `<scripts>` is this skill's `scripts/` folder, written absolute.

## Stores

| R365 location | DoorDash store | store id |
|---|---|---|
| 10100 Snarf's Sandwiches 1 - MX | MX - Washington Ave | 167545 |
| 10400 Snarf's Sandwiches 2 - SLU | SLU - Grand Blvd | 167548 |
| 10300 Snarf's Sandwiches 3 - Skinker | Skinker Blvd | 151336 |
| 10200 Snarf's Sandwiches 4 - Page | Page | 863421 |
| 10700 Snarf's Sandwiches 5 - Fenton | Fenton | 25996076 |
| 10800 Snarf's Sandwiches 6 - Kirkwood | Kirkwood | 28105709 |
| 10900 Snarf's Sandwiches 7 - Spirit | Chesterfield | 42367837 |

One DoorDash business (404902) covers all seven. Spirit opened 4/29/2026.

## Logins

```bash
bash <scripts>/r365-login.sh snd     # R365, tlaroche, ~/.claude/snarfs-credentials.md
bash <scripts>/dd-login.sh sdd       # DoorDash, mark+04, saved profile ~/.claude/playwright-profiles/snarfs-doordash
```

DoorDash asks for a 6-digit code mailed to the login address; `dd-login.sh` opens the code dialog and stops. Hand over for the code and say so. The saved profile keeps the device trusted afterwards, and only one browser can hold the profile at a time.

R365 allows one session per user. Another run signed in as tlaroche (the Grubhub or advance orders skills) logs this one out mid-step: a script then fails on a missing grid or `could not unapprove`. Rerun `r365-login.sh`, read the entry back, and retry the step.

## The entry

Every store has one `DoorDash` entry per Sunday, pre-created as an Approved template at 0.00. Six stores carry five lines; Spirit carries two.

| Line | Account | Amount |
|---|---|---|
| A/R (comment varies) | 10130 Door Dash Receivable | credit `D - net` |
| commission(s) & fees | 70400 DoorDash Fees | debit, DoorDash shown positive |
| marketing spend | 70400 | debit, DoorDash shown positive |
| amendments | 70400 | debit when DoorDash shows it negative, credit when positive |
| discrepancy (spelling varies) | 42060 Customer Refund | `D - Sales`, debit if positive |

Spirit: credit 10130 and debit 70400, both `D - net`. A negative `D - net` (a large positive amendment, 10/11/2026) flips both sides.

The discrepancy runs DoorDash Sales above D by a round 30 to 280 a week at every store, so it is normally a credit. `plan.js` warns past 400.

## Steps

1. **Payouts.** `bash <scripts>/dd-payouts.sh sdd <Monday YYYY-MM-DD> <Sunday+5 YYYY-MM-DD> pay.json`. Sunday's payout is dated the Thursday after. `STORE=<name>` keeps one store.
2. **GL.** `bash <scripts>/gl/gl-detail.sh snd <Monday, three weeks back, M/D/YYYY> <today M/D/YYYY> gl.csv`, then `node <scripts>/gl-parse.js gl.csv gl.json`. Starting back lets `plan.js` match payouts to their deposits.
3. **Plan.** `node <scripts>/plan.js pay.json gl.json <Sunday M/D/YYYY> > plan.json`. Per store it gives `D, sales, net, ar, fees, mkt, amd, diff`, the payout ids with their deposit days, `warnings`, and `fail` when a payout does not close to its net or the store has no payout. Read every warning before posting: uncovered sales days mean the week is not complete; a payout that `never reached 10130` was deposited to another account and the balance carries it; a doubled DSS is the human's to fix.
4. **Find the entries.** `bash <scripts>/find-entries.sh snd <Sunday M/D/YYYY>` prints `location|TransactionId|status|amount|attachment`.
5. **Post** each store: `bash <scripts>/post-entry.sh snd <TransactionId> plan.json <store>`. It unapproves, prints the lines the entry held, sets every line, checks the sides balance, saves, reloads and reads back, then prints `SAVED <id> <total>` and exits 0. Approve with `bash <scripts>/approve.sh snd <id>...` only after that exit; chain them with `&&` directly, since a pipe such as `| tail` swallows the failure and approves anyway.
6. **Backup.** One PDF per entry, `DoorDash <store> <MM.DD> backup.pdf`:
   ```bash
   bash <scripts>/read-entry.sh snd <id> rb-<store>.json
   node <scripts>/backup/build-backup.js plan.json <store> pay.json gl.json rb-<store>.json html/<store>.html   # ties or DOES NOT TIE
   bash <skills>/snarfs-grubhub/scripts/backup/render-pdf.sh html <store> "att/<store>/DoorDash <store> <MM.DD> backup.pdf"
   bash <scripts>/attach.sh snd <id> att/<store>
   ```
   Stop on DOES NOT TIE. A PDF under 1 KB is a blank page. `attach.sh` adds the PDF beside the preparer's own files and reads the titles back.
7. **Tie-out.** After the week's deposits are in, `node <scripts>/tie.js pay.json gl.json` prints each Sunday's balance beside the next Monday to Friday's 10130 deposits. `diff` reads 0.00 at every Sunday except a bank holiday week. It also lists any payout with no 10130 deposit. On a Thursday run the Friday deposit is still to come, so check the prior Sunday.
8. **Verify** with `find-entries.sh`: every row Approved at the planned total with the backup in `attachment`.

Close the sessions by name at the end (`playwright-cli -s=snd close`, `-s=sdd close`).

## Reviewing past entries

Pull payouts and the GL from the period to review through today, run `tie.js`, and compare each week's booked credit against `plan.js` for that Sunday. Report the weeks that do not tie before correcting anything; correct an approved entry only when the human says so, with `post-entry.sh`, which rewrites it in place.

## Unattended run

`<scripts>/thursday-run.ps1` runs from Task Scheduler on Thursdays at 14:00 with a retry Friday at 8:00 (`<scripts>/register-task.ps1` sets both up). It takes the week that ended the Sunday before and starts this skill headless with a prompt beginning `Unattended run`, naming the week, the work directory, the entry date and whether this is the final attempt.

No human answers during the run, so:

- `cd` into the work directory once, before opening any session, and run every command from there. Use sessions `sddu` (DoorDash) and `sndu` (R365).
- A DoorDash code challenge or a rejected login fails the run: write `result.json` with the reason in `note` and post nothing.
- When `plan.js` warns of uncovered sales days and the prompt says `Final attempt: no`, write `{"waiting": true}` to `result.json` and stop. On the final attempt, post nothing for that store and report it `no-payout` with the days in `warnings`.
- An entry already carrying amounts is `skipped`. Every `plan.js` warning, and a backup that does not tie or attach, goes in `warnings`; post anyway unless the store has `fail`, which makes it `failed`.
- Approve only after `post-entry.sh` prints SAVED. A store that fails a step is `failed`, with the step in `warnings`, and the others carry on.
- Never correct an approved prior entry; report a tie-out error in `note`.

Finish with steps 6 to 8, close `sddu` and `sndu`, then write `result.json` in the work directory. The wrapper posts it to the Snarf's TPD Teams channel through `<scripts>/notify-teams.ps1`, tagging Collin Heyerdahl every week:

```json
{ "period": "10/5/2026 - 10/11/2026", "entryDate": "10/11/2026", "note": "",
  "stores": [ { "store": "MX", "status": "approved", "amount": 905.17, "payouts": ["..."], "transactionId": "...", "backup": true, "warnings": [] } ] }
```

`status` is `approved`, `skipped`, `no-payout`, `posted-unapproved` or `failed`. The webhook lives in `~/.claude/snarfs-doordash.json`, outside the repo: `{"teamsWebhook", "mention": {"name","email"}, "mentionWhen": "always"|"attention"}`. `notify-teams.ps1 -DryRun` prints the card. `done.txt` marks a reported week; `-Force` reruns it and `-Date yyyy-MM-dd` stands in for today.

## History

Reviewed 10/15/2026 against DoorDash and the approved GL from May. Entries were plugged to the next week's deposits, which went wrong when a deposit was missing from R365 at the time or an unapproved entry was read. Corrected then:

- Spirit 6/14, 6/21, 6/28, 9/6 rewritten to DoorDash (9/6 had missed two 9/8 real time payment deposits, 2,394.28). 10/11 posted as a 1,170.82 debit to 10130: payout 619094347 carried a 1,868.41 adjustment, booked to 70400.
- Spirit 7/5 stays at 251.03, 95.32 above DoorDash: deposit BD025016 (7/6, payout 591375829) credits 70400 instead of 10130, and the entry offsets it.
- Skinker 9/6 rewritten to 1,205.85 (it had plugged the unapproved NJ00047545, 3,435.20). Skinker 10/4 discrepancy rewritten (over-credit 1,903.30).
- Week ending 10/11 was the first run of this skill: all seven approved with backups, 8,828.43.

After these, every store's Sunday balance equals the next week's deposits from May through 10/4, except the Juneteenth week (6/14).

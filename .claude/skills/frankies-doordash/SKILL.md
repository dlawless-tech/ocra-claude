---
name: frankies-doordash
description: Post the weekly DoorDash fee journal entries into Frankie's Spuntino Restaurant365, one for Frankies 457 and one for F&F Pizzeria, clearing 1230 DoorDash Receivable against commissions, marketing spend, amendments and the discrepancy from DoorDash's payouts for the Monday-to-Sunday week. Use when asked to post, balance, review, or approve the Frankies DoorDash entries in R365, or to check Frankies 1230 against DoorDash.
---

# Frankies DoorDash, weekly by store

Same logic as [`../bowery-doordash`](../bowery-doordash/SKILL.md): the week runs **Monday to Sunday**, the entry is dated the **Sunday**, and a payout belongs to the week its covered window starts in. Frankies differs in three ways: DoorDash pays **daily**, so a week holds four to six payouts per store; the figures come from DoorDash's API instead of the payout tiles; and the entries already exist as templates numbered `DoorDash`, one per store, so posting fills them in place.

Work from one fixed scratch folder for the whole run, since `playwright-cli` binds sessions to the folder. Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for R365 grid habits. `<scripts>` is this skill's `scripts/` folder.

## Stores

| R365 location | DoorDash store | store id | bank deposits from |
|---|---|---|---|
| Frankies 457 | Frankies Spuntino | 4805 | SORCERER INC |
| F&F Pizzeria | F&F Pizzeria | 991755 | F F PIZZERIA LLC |

The portal's business group also lists F&F Pizzeria (Beverly Rd), F&F Pizzeria (5th Ave), Frankies Pizzeria at the Arcade and Frankies Spuntino & Pizzeria (Nashville). None of them pays into this R365's 1230, so the entries leave them out.

## Logins

```bash
bash <scripts>/r365-login.sh fkd       # R365, frankiesspuntino, login in ~/.claude/bowery-credentials.md
bash <scripts>/dd-login.sh fdd         # DoorDash on a saved profile, ~/.claude/frankies-credentials.md
```

DoorDash can mail a 6-digit code to tricia@ocra-us.com, and `dd-login.sh` stops on the code screen. Hand over for the code and say so. The saved profile keeps the device trusted, so it logged straight in on 10/15/2026.

## The entry

Five lines, keyed by the comment the template already carries:

| Comment | Account | Amount |
|---|---|---|
| doordash receivable from GL detail report - total net payout | 1230 DoorDash Receivable | credit `D - Net` |
| commissions & fees | 6215 3rd Party Delivery Commissions | debit Commission & fees |
| marketing spend | 6215 | debit Marketing spend |
| amendments | 4500 Discounts and Comps | debit if DoorDash shows it negative, credit if positive |
| discrepancy | 4105 Sales, Food | `D - Sales`, debit if positive, credit if negative |

**D** is the week's `Third Party Delivery` debits to 1230 at the location, from the daily sales summaries. DoorDash's **Sales** includes tax and tips; its **Marketing spend** includes the merchant-funded customer discounts.

**The discrepancy is a credit of about 1,100 to 1,700 per store per week since May 2026, and that is normal.** The daily sales summaries book DoorDash promos as a 4500 discount and the receivable at the discounted amount, so D sits below DoorDash's Sales. The user rules it missing sales, so it stays on 4105. A week far outside that range points to a wrong payout set or a bad sales day.

**Check: 1230 ties.** After the entry posts, the location's 1230 balance at the end of Sunday equals the net of that week's payouts not yet deposited. A payout with a large amendment (8/31/2026 F&F, 39,931.90) is a DoorDash Capital advance; its deposit is split so the advance never touches 1230, and the week's entry uses the payout's other figures only.

## Steps

1. **Payouts.** `bash <scripts>/dd-payouts.sh fdd <Monday YYYY-MM-DD> <Sunday+5 YYYY-MM-DD> pay.json` pulls both stores' payouts dated in the range, each with its covered window. Sunday's payout is dated the Thursday after, so a week is ready once that payout is out.
2. **GL.** `bash <scripts>/gl-detail.sh fkd <Monday M/D/YYYY> <Sunday M/D/YYYY> gl.csv`, then `node <scripts>/gl-parse.js gl.csv gl.json`. Start a few weeks back when checking the tie.
3. **Plan.** `node <scripts>/plan.js pay.json gl.json <Sunday M/D/YYYY> > plan.json` prints `ar`, `fees`, `mkt`, `amd` and `diff` per store. It stops on a payout that does not close to its net. On stderr, each `WARN` needs a decision before posting:
   - *GL sales with no payout covering them yet*: the week is not complete. Wait, or report.
   - *carries its DoorDash line twice*: a doubled daily sales summary. Its journal entry is read-only, and the DSS itself has to be fixed (delete and repoll from Toast) before the week is right. That is the human's call.
   - *amendment over 1,000*: see the Capital note above.
4. **Find the entries.** `bash <scripts>/find-entries.sh fkd <Sunday M/D/YYYY>` prints `location|TransactionId|status|amount` for the week's two `DoorDash` templates.
5. **Post** each store: `bash <scripts>/post-entry.sh fkd <TransactionId> <ar> <fees> <mkt> <amd> <diff>`. It unapproves an Approved template, sets the five lines by comment, puts the discrepancy on 4105, checks the totals, saves, reloads and reads back. It prints `SAVED <id> <total>` and leaves the entry Unapproved.
6. **Approve** with `bash <scripts>/approve.sh fkd <id>...`, then rerun `find-entries.sh` and confirm both rows read **Approved** at the planned total (fees + marketing + any debit amendment or discrepancy).

7. **Backup.** Each entry carries one PDF named `DoorDash <457|F&F> <MM.DD> backup.pdf`, dated the entry. It shows the entry as posted, every payout in the week closing to its net, D less net against the 1230 credit, D less Sales against the discrepancy, and the GL debits by day. Per store, with `<tag>` `457` or `FF`:
   ```bash
   bash <scripts>/read-entry.sh fkd <id> rb-<tag>.json
   node <scripts>/backup/build-backup.js plan.json "<location>" pay.json gl.json rb-<tag>.json html/<tag>.html   # prints ties or DOES NOT TIE
   bash <skills>/bowery-grubhub/scripts/backup/render-pdf.sh html <tag> "att/<tag>/DoorDash <457|F&F> <MM.DD> backup.pdf"
   bash <scripts>/attach.sh fkd <id> att/<tag>
   ```
   Stop on DOES NOT TIE. A PDF under 1 KB is a blank page. `attach.sh` makes the entry's attachments exactly the folder, deleting others, so list them first and leave an entry alone if it holds someone else's file. An Approved entry takes the upload and stays Approved. `<skills>` is the repo's `.claude/skills`, written absolute.
8. **Verify** with `find-entries.sh`: both rows Approved at the planned total, and `attach.sh` printed the PDF under `attached:`.

Close the sessions by name at the end (`playwright-cli -s=fkd close`, `-s=fdd close`). The DoorDash login runs on a saved profile, so only one DoorDash session can be open at a time, and the unattended run needs it free.

## Unattended run

`scripts/thursday-run.ps1` runs from Task Scheduler on Thursdays at 10:30, with retries Thursday 14:00 and Friday 6:00 (`scripts/register-task.ps1` sets them up). It takes the Monday to Sunday week that ended the Sunday before and starts this skill headless with a prompt beginning `Unattended run`, naming the week, the work directory, the entry date and whether this is the final attempt. Sunday's payout is dated Thursday; on 10/15/2026 it was out by 10:00.

No human answers during the run, so:

- Never ask. `cd` into the work directory once, before opening any session, and run every command from there. Use session `fdu` for DoorDash and `fku` for R365, so an interactive run's sessions are left alone.
- A DoorDash code challenge or a rejected login fails the run: write `result.json` with the reason in `note` and post nothing.
- Pull payouts dated Monday through the entry date plus five days. When `plan.js` warns of GL sales with no payout covering them and the prompt says `Final attempt: no`, write `{"waiting": true}` to `result.json` and stop; the wrapper waits for the next trigger. On the final attempt, post nothing for that store and report it `no-payout` with the uncovered days in `warnings`.
- A doubled DSS line, an amendment over 1,000, or a discrepancy outside 800 to 2,000 credit goes in `warnings`; post anyway unless the payout fails to close, which makes the store `failed`.
- A template already carrying amounts is `skipped`. Approve only after `post-entry.sh` prints SAVED. A store that fails a step is `failed`, with the step in `warnings`, and the other carries on.
- Never correct an approved prior entry; report it.
- R365 can drop to its login page mid-run. When a script fails on a missing grid or prints NOT APPROVED, rerun `r365-login.sh fku` and retry that step once.

Finish with steps 7 and 8, close `fdu` and `fku` by name, then write `result.json` in the work directory. The wrapper posts it to the Frankie Spuntino TPD Teams channel through `scripts/notify-teams.ps1`:

```json
{ "period": "10/5/2026 - 10/11/2026", "entryDate": "10/11/2026", "note": "",
  "stores": [ { "store": "Frankies 457", "status": "approved", "amount": 4942.69, "payouts": ["619370709"], "transactionId": "...", "backup": true, "warnings": [] } ] }
```

`status` is `approved`, `skipped`, `no-payout`, `posted-unapproved` or `failed`. The webhook lives in `~/.claude/frankies-doordash.json`, outside the repo: `{"teamsWebhook", "mention": {"name","email"}, "mentionWhen": "always"|"attention"}`. It tags Collin Heyerdahl every week. `notify-teams.ps1 -DryRun` prints the card without posting. `done.txt` in the work directory marks a reported week; `-Force` reruns it and `-Date yyyy-MM-dd` stands in for today.

## History

Reviewed 10/14/2026 against DoorDash for 4/26 to 10/4/2026. Every week matched DoorDash to the penny, except these:

- F&F 10/4 was rebuilt.
- 6/21 overstated the 1230 credit at both stores, and 6/28 reversed it.
- F&F 8/9 put 6.00 of amendments on the discrepancy line.

The discrepancy line of every entry from 5/3 to 10/4 moved to 4500 on 10/14 and back to 4105 on 10/15 at the user's call. Weeks before 4/26 cannot be checked line by line, because DoorDash's API serves only about six months. F&F 2/22 and 3/1 carry an offsetting 3,704.10 / 3,364.22 swing, and 1230 ties by 4/26.

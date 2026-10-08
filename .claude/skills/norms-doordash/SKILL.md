---
name: norms-doordash
description: Reconcile DoorDash payouts into the weekly NORMS Restaurant365 DoorDash journal entries, one per store across the 24-store estate, clearing 1111 A/R Doordash against commission & fees, marketing spend, amendments and the difference. Use when asked to post, balance, or approve the NORMS DoorDash entries in R365, to review or correct past weeks against DoorDash, or to pull a NORMS store's DoorDash payout figures.
---

# DoorDash payouts into the NORMS journal entries

Three steps: **read** every figure (DoorDash payouts, one GL report, the posted entries), **plan** each store's lines with `plan-week.js`, then **post** them. Reading is all bulk, so the 24-store estate costs about the same as one store.

Run from one scratch directory for the whole run. `playwright-cli` binds sessions to the working directory, and a `cd` mid run strands them. `<skill>` below is this folder, written absolute.

```bash
bash <skill>/scripts/dd-login.sh ndd       # DoorDash merchant portal
bash <skill>/scripts/r365-login.sh nr      # R365, entries
bash <skill>/scripts/r365-login.sh nrb     # R365, GL report
```

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting R365. It is shared with the other NORMS skills, so fix R365 platform behavior there.

## Logins

Credentials live in `~/.claude/norms-credentials.md` under `## DoorDash` and the R365 block. Read them from there rather than asking the human.

DoorDash mails a 6-digit code to `mark+41@ocra-us.com` at login. `dd-login.sh` stops on it with `FAIL: still on identity.doordash.com`. Hand the keyboard over for the code and say so. One DoorDash session serves the run, and reading payouts through the API keeps it on one page, so the code is asked once.

After the code the portal opens a "Try it now" intro dialog. Click **Maybe later**.

## The week

The period runs **Monday to Sunday**. The entry is dated the **Saturday inside it**, so Mon 9/7 to Sun 9/13 posts to the entry dated 9/12. DoorDash pays the week the following **Thursday** (9/17), and the bank deposit lands **Friday** (9/18).

R365 carries one entry per store per week, numbered `DoorDash`. A week's 24 entries are created ahead as templates, already **Approved at 0.00**, with the five lines below carrying accounts, comments and location.

## Read

**DoorDash payouts.** `scripts/payouts.sh ndd <first payout date> <last payout date> payouts.json` posts to the same `payout_summaries` API the Financials page calls and saves every payout in the window: one row per store per Thursday with `sales`, `commissionAndFees`, `marketingSpend`, `amendments` and `netPayout` at DoorDash's displayed signs. It prints the count per payout date, which reads 24 for a full week. The page itself shows 20 rows a page; the script asks for 200.

**R365 sales, D.** The daily journal entries debit `1111 - A/R Doordash` with each day's DoorDash sales including tax. A store's Monday to Sunday debits are **D**, what the entry clears. In `nrb`, Reports > My reports (soft navigate to `/react/reports-management/legacy/MyReports`, then wait about 30 seconds for the cards). The **Recent** row's GL Account Detail card holds its own Customize button. Set the account to `1111 - A/R Doordash` through `r365options.querySearch('1111')`, fill Start and End, Run, and save the report tab's cells:

```bash
grep -oE 'cell "[^"]*"' rep.txt | sed 's/^cell "//; s/"$//' > cells.txt
node <skill>/scripts/gl-parse.js cells.txt > gl.json
```

`gl-parse.js` groups rows by each row's own location cell, so it reads the report grouped or ungrouped. Subtotal By is a toggle: re-running the param script on a dialog already set to Location turns it off, which is harmless here.

Window the report from the first Monday through the Friday after the last Sunday. The Friday rows carry each week's `Bank Deposit`, which is the A/R check below.

**The posted entries.** In `nr`, soft navigate to All Transactions **from the home dashboard**. From a `#/form/...` entry page the same pushState logs the session out, and `r365-login.sh` reports an entry page as already authenticated, so a session that last read entries needs a login again first. Then `eval "$(cat <skill>/scripts/grid-ids.js)"` prints every DoorDash entry as `date|location|TransactionId|status|amount`. Put a week's rows into `ids.txt` as `location|TransactionId` and read them:

```bash
bash <skill>/scripts/read-week.sh nr ids.txt entries.json
```

**One reader per session.** Two loops driving one browser race each other's `goto`, and every read lands under the wrong store. `read-week.sh` keys each entry by the location its own lines carry and drops any read that disagrees, so a race shows as `FAIL: page showed another entry`. For speed, split `ids.txt` across sessions `nr` and `nr2`, one loop each. Launch each with `run_in_background` directly, since a `&` child of a background shell outlives its parent and keeps driving the browser.

## The lines

| Comment (verbatim on the template) | GL | Amount |
|---|---|---|
| `a/r doordash - payout` | Cr 1111 - A/R Doordash | D - netPayout |
| `commission & fees` | Dr 5514 - Online Ordering Expense | commissionAndFees shown positive |
| `marketing spend` | Dr 5514 - Online Ordering Expense | marketingSpend shown positive |
| `amendments` | 5514 - Online Ordering Expense | negative amendments as a debit, positive as a credit |
| `difference` | 5915 - Delivery over Short | D - sales, debit if positive, credit if negative |

The difference falls out of the payout identity `sales - commission - marketing + amendments = net`, so a store whose lines balance and whose DoorDash identity holds is right. The difference runs to tens of dollars for most stores and to several hundred when R365's daily sales and DoorDash's week disagree. Rialto 9/26 posted −418.97, which was correct: DoorDash counted 3,146.46 against R365's 2,727.49. A large difference is a sales question for the human, and the entry still posts.

**Do not use the beginning balance for the A/R credit.** Use D. When a payout is late, the beginning balance carries it and the whole receivable would land in the difference.

**The A/R check.** After the entry, the store's A/R balance equals netPayout, and the following Friday's `Bank Deposit` clears exactly that. In the September run all 48 entries for 9/12 and 9/19 tied this way to the penny, which proves D, the week and the store mapping before any DoorDash figure is read. A week whose deposit has not been imported yet checks against netPayout instead.

**Store mapping.** `scripts/stores.json` maps DoorDash store id to R365 location. Map by id, since six names differ: Valley Blvd is El Monte, Harbor Blvd is Costa Mesa, Torrance is North Torrance, Huntington is Huntington Beach, Ontario Mills is Ontario, and `NORMS - 4605 W Charleston Blvd` is Las Vegas. `plan-week.js` stops on an id it does not know.

## Plan

```bash
node <skill>/scripts/plan-week.js payouts.json gl.json 9/17/2026 9/12/2026 entries.json > plan.json
```

Arguments are the Thursday payout date and the Saturday entry date. It writes each store's five lines, and with an entries file it prints every posted line that differs and the count of wrong stores. Without one it plans a fresh week. Every store must show the DoorDash identity holding; a failure means a payout carries a field the five lines do not model.

## Post

```bash
bash <skill>/scripts/post-week.sh nr plan.json          # every store, a new week
bash <skill>/scripts/post-week.sh nr plan.json wrong    # only the stores plan-week flagged
```

`post-entry.sh` does one store: try to unapprove when Approved, set the lines through the Kendo model by comment, check both sides balance, save, read the `SaveTransaction` body, reload, check again, then approve only if the entry is not already Approved. Read status from the ribbon: an Approved entry shows `#Unapprove`. Page text matches "Approved" inside "Unapproved" and elsewhere.

On the 10/3/2026 corrections the save landed with every entry still Approved: the reload showed the new amounts, `#Unapprove` on the ribbon, and the All Transactions grid agreed. The script now reports that as `DONE (Approved)`.

Changing an approved entry from a prior week is the human's call. Report the planned corrections and get a yes before running `post-week.sh ... wrong`. A new week's 0.00 templates have not been posted with it yet, so watch the first store of that run.

## Verify

Re-read the week with `read-week.sh` and run `plan-week.js` against it again: `0 wrong`, and every entry Approved. Report the store table with payout ids, totals and any store that failed.

Deposits with no payout behind them are worth reporting on their own. In September, Santa Ana took a second deposit of 429.57 on 9/25, reference `DOORDASH - ST-K0G8A4M9R9S7`, that matches no Santa Ana payout and sits as an extra credit on 1111.

## Close

Close the sessions this run opened, by name, from the run directory: `for S in ndd nr nr2 nrb; do playwright-cli -s=$S close; done`. Other skills keep their own sessions open on this machine, so leave every other session alone.

## Unattended run

`scripts/thursday-run.ps1` runs from Task Scheduler on Thursdays at 4:00 AM, with a retry at 10:00 AM (`scripts/register-task.ps1` sets up both). It takes the Monday to Sunday period that ended four days earlier, paid that Thursday, and starts this skill headless with a prompt beginning `Unattended run` that names the period, the work directory, the entry date, the payout date and the stores. It writes `started.txt` in the work directory first, so a period runs once; `-Force` reruns it, and `-Date yyyy-MM-dd` stands in for today. `-Only Anaheim,Claremont` is a one-off catch-up for stores whose payout came late: it skips the marker and the retry, and the prompt allows a payout dated any day from the Thursday through today.

Some payouts are not listed at 4:00. On 10/8/2026, 22 stores were paid by 2:15 AM and Anaheim and Claremont were still missing hours later. When the 4:00 attempt reports a store `no-payout`, or writes no result, the wrapper keeps its result as `result-first.json`, lists the waiting stores in `pending.json` and posts nothing to Teams. The 10:00 attempt runs only those stores, merges both attempts into `result.json` and posts one card, which tags the mention every week.

No human answers during the run, so:

- Work only the stores the prompt names under `Stores`, and report only those in `result.json`.
- Never ask. `cd` into the work directory once, before opening any session, and run every command from there. Use session names `nddu` (DoorDash), `nru` (entries) and `nrbu` (GL report), so an interactive run's sessions are left alone.
- A DoorDash code challenge or a rejected login fails the whole run: write `result.json` with the reason in `note` and post nothing.
- A store with no payout dated the payout date is `no-payout`, posted nothing, with its D in `warnings`.
- An Approved template at 0.00 is filled with `post-entry.sh`. An entry that already carries amounts and matches the plan is `skipped`. One that carries amounts and differs from the plan is `mismatch`, left as it is, with each differing line in `warnings`. A store whose post fails a check is `failed`, with the failing step in `warnings`, and the others carry on.
- A difference over 100.00 either way, a beginning balance that differs from the prior Friday's `Bank Deposit`, and a deposit with no payout behind it go in `warnings`, as does plan-week's `SALES ON n OF 7 DAYS`. The entry still posts.
- An `a/r doordash - payout` line that comes out a debit means R365 is missing a day's sales. North Torrance 10/3/2026 had no 10/4 sales and came out 14.43 short of its payout. Post nothing for that store; it is `failed`, with the missing day in `warnings`.
- Never correct an approved entry from a prior week; report it.

Finish with **Verify**, close the sessions by name, then write `result.json` in the work directory. The wrapper posts it to Teams through `scripts/notify-teams.ps1`, and reports a failure when the file is missing:

```json
{ "period": "9/28/2026 - 10/4/2026", "entryDate": "10/3/2026", "note": "",
  "stores": [ { "store": "Whittier", "status": "approved", "amount": 890.24, "payout": "618066093", "transactionId": "...", "warnings": [] } ] }
```

`store` is the R365 location exactly as `stores.json` spells it. `amount` is the entry's total, its debit side. `status` is `approved`, `skipped`, `no-payout`, `mismatch`, or `failed`. The webhook lives in `~/.claude/norms-doordash.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "<name>", "email": "<work email>"}, "mentionWhen": "always"}`. It posts to the NORMS TPD channel and tags Regina Leong. `notify-teams.ps1 -DryRun` prints the card without posting.

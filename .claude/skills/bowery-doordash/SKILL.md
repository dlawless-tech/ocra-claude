---
name: bowery-doordash
description: Reconcile DoorDash payouts into the matching Bowery Group Restaurant365 journal entries, for one store or for all four in a batch, with a tie-out and the DoorDash payout capture attached to each as backup. Use when asked to post or balance a Bowery DoorDash payout in R365, to pull a Bowery store's DoorDash payout figures, or to check the Bowery A/R Door Dash balance against a payout.
---

# DoorDash payout into a Bowery journal entry

Two phases. **Gather** every figure first, from DoorDash and from one GL report, then **post** the entries and attach their backup. Both phases read in bulk, so a four store run costs about the same reading as a single store.

Sessions:

```bash
playwright-cli open --headed https://www.doordash.com/merchant/login                           # DoorDash
playwright-cli -s=r365 open --headed https://bowerygroup.restaurant365.com/react/accounting   # journal entries
playwright-cli -s=r365b open --headed https://bowerygroup.restaurant365.com/react/accounting  # GL report
```

`playwright-cli` binds sessions to the working directory. Stay in one directory for a whole run, and never `cd` mid run or the sessions vanish. Run from a scratch directory such as the scratchpad: captures, backup PDFs and the files `attach.sh` uploads land under it, and `playwright-cli upload` takes a path relative to it.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting any of this. R365 is a legacy Angular app whose grids and report dialogs ignore scripted input and fail silently, and every rule in that file was paid for with a wrong or empty entry. It is shared with the `bowery-ubereats` and `bowery-grubhub` skills, so fix R365 platform behavior there once rather than in three places.

## The period

Bowery's DoorDash period runs **Monday to Sunday**, and the journal entry is dated the **Sunday that ends the period**, so 8/31 through 9/6 posts to the entry dated 9/6. The GL report window is the period itself.

DoorDash pays that period the following **Thursday**, so the period ending 9/6 settles on the payout dated 9/10. The payout's own date sits four days outside the period it covers, which is why the covered window has to be read off the payout rather than inferred from its date.

## Logins

Credentials live in `~/.claude/bowery-credentials.md`, outside any repo. Read them from there rather than asking the human. Missing or rejected credentials are the one case worth asking about.

DoorDash logs in through `identity.doordash.com` in two steps: fill the email, click **Continue to Log In**, then fill the password and click **Log In**.

**DoorDash then demands two factor authentication, and the first click does not show the code dialog.** It renders "This action requires two-factor authentication" beside the password field and nothing else. Click **Log In** a second time to get the dialog, which mails a 6-digit code to the merchant address. Hand the keyboard over for the code and say so. Never guess or wait on it. Once the code lands, the session runs unattended.

The DoorDash session drops if you `open` a new merchant-portal URL on it. Re-login goes straight through on the same password without a second code, so re-authenticate rather than asking for another one. Navigate the portal by clicking its own links after the first load.

R365 posts a username and password form at `identity.restaurant365.com`. `scripts/r365-login.sh <session>` logs in and is safe to re-run. Reach pages by clicking the home dashboard nav, since opening a `/react/...` URL drops the session; `R365-AUTOMATION.md` carries the detail.

## The four stores

| DoorDash | R365 location |
|---|---|
| `Cookshop` | `200 - Cookshop` |
| `Rosie's (2nd St)` | `Rosie's` |
| `Shuka (Macdougal St)` | `Shuka` |
| `Vic's (Great Jones St)` | `Vic's` |

R365 writes Rosie's and Vic's with a curly apostrophe. Match locations on an ASCII fragment (`Rosie`, `Vic`) so shell quoting never has to carry the character.

## Phase 1: the DoorDash figures

**Payouts**, at `merchant-portal.doordash.com/merchant/financials`. It opens on **Last 30 days** across **All businesses and stores**, which already covers a single period's four payouts.

The list shows only **Payout date**, **Payout ID**, **Net payout** and **Store**, one row per store, so open each payout's detail for the rest. Its tiles read **Sales**, **Commission & fees**, **Marketing spend** and **Amendments** under the **Net total**, and `scripts/backup/capture-payout.sh` lands on that detail, so read the tiles right after each capture:

```bash
playwright-cli eval "() => (document.body.innerText.replace(/\n/g,' | ').match(/Net total \| .*?Transactions/)||['?'])[0]"
```

A first login lands on a portal tour and a video opt-in popover, which swallow clicks on the nav. Click the tour's **Skip** and the popover's **Close**, then the **Payouts** nav button.

Commission & fees and Marketing spend show as negatives and enter R365 as positive debits.

**Amendments carries either sign, and its sign picks the column.** A negative is a charge against the merchant and posts as a debit. A positive is a credit back to the merchant and posts as a credit. Read the sign per store: in the 8/31 to 9/6 week Shuka ran positive at 218.70 while the other three ran negative or zero, and in the 9/7 to 9/13 week Shuka alone ran negative at 57.97.

Check each store before moving on: `Sales - Commission & fees - Marketing spend + Amendments` equals Net payout, with each figure taken at its displayed sign. This closes to the penny when the figures are read right.

**Status reads Pending or Processing until the money moves, and the figures are final either way.** Thursday's payouts are still settling on Thursday, so a period is postable the day it pays.

### The covered window

Click a row to open its detail. Three mechanics govern the page:

- **Only real clicks register.** Use `playwright-cli click` against a snapshot ref rather than an `eval` click.
- **Go back through the breadcrumb `Payouts` button**, resolved from a fresh snapshot each time, since its ref changes on every render. With a detail open, a click on another row does nothing.
- A **Qualtrics survey overlay** sometimes covers the page. Close it before clicking anything under it.

The detail header states the covered window verbatim, and it is the only trustworthy source for which period a payout settles:

```
Payout #610462132 for transactions from 12:15 PM on Aug 31, 2026, to 11:04 PM on Sep 6, 2026 for Cookshop
```

A window narrower than the period is normal. Vic's read Sep 1 to Sep 5 for the 8/31 to 9/6 period and Sep 8 to Sep 12 for 9/7 to 9/13, because those were its only order days. Confirm it against the GL, where a store with a narrow window carries no debit rows on the missing days.

## Phase 2: the period debits

The daily journal entries debit `104-05 - A/R - Door Dash` with each day's third party sales including tax. The period's debits, call this **D**, are what the entry clears.

Reports > My reports in `r365b`. Run **GL Account Detail** through Customize with account `104-05 - A/R - Door Dash`, Start the period's first day, End its last day, the location filter on all locations, and **Subtotal By** set to **Location**. Read each location's `Total A/R - Door Dash` **Debit** figure, which is that store's D.

The window is the period because Subtotal By groups only when the window holds detail rows. A window after the period holds none, so the report collapses to one ungrouped total.

Each location's block also shows a beginning balance and a Bank Deposit line clearing it. That pair confirms the prior period's payout landed; a missing deposit is worth reporting before posting.

## The arithmetic

The entry carries five lines, keyed by the comment R365 already holds on each template line. The template says "commissions & fees" where DoorDash's card says "Commission & fees", so copy the comments off the entry verbatim:

```
credit "a/r debit from prior week less total payout"  =  D - Net total
debit  "commissions & fees"                           =  Commission & fees shown positive
debit  "marketing spend"                              =  Marketing spend shown positive
       "amendments"                                   =  Amendments, debit if DoorDash showed it negative,
                                                         credit if positive
       "difference"                                   =  D - Sales
                                                         debit if positive, credit if negative
```

The A/R line posts to `104-05`, and the four others all post to `632-02 - Delivery Fees`.

**The difference line equals `D - Sales` exactly.** That falls out of the payout identity rather than approximating it, so it is a real check on every other figure: compute the difference as the plug that balances the entry, then confirm it against `D - Sales`. A mismatch means one of the five DoorDash figures or D was read wrong. It is the gap between what R365 booked as third party sales and what DoorDash counted, and it has run from 20.00 to 205.53 across the four stores in a typical week.

**Do not use the account's beginning balance for the credit.** Beginning balance equals D only while the prior period's payout has already been deposited and booked. Payouts lag by four days and sometimes miss a week, and when one is outstanding the beginning balance carries it, pushing the whole undeposited receivable into the difference line and expensing it to Delivery Fees.

**Check the resulting A/R balance instead.** After the credit posts, the account's balance for that location should equal Net total, which is the receivable awaiting the next deposit. This confirms the formula in one subtraction and works even in a week with no prior entry to compare against.

## Finding the entries

Bowery carries one DoorDash entry per week, dated the Sunday that ends the period.

Accounting > Transactions > All transactions, reached by clicking **Accounting** in the home dashboard nav. Filter Number (`Contains`) to `Door`, then harvest every entry and its id from the grid's data source in one call rather than clicking through rows. `R365-AUTOMATION.md` carries the call and the direct entry URL it feeds.

Each entry arrives as a template: five lines carrying accounts, comments, and location, every amount at 0.00. **Read the comments off the first entry you open and use them verbatim** for the rest of the run, since the posting script keys every line by its comment text.

A template can arrive already **Approved** at 0.00, as the 9/27 and 10/4 weeks did. An Approved entry is read-only: the grid cells open no editor. `post-entry.sh` unapproves an Approved entry whose lines are all 0.00, prints `unapproved the empty template`, reloads (the grid stays out of the snapshot until it does), and posts it as usual. An Approved entry carrying any amount is someone's finished work: the script skips it, and changing one is the human's call.

Entries from before September 2026 are a two line reclass between `104-05` and `104-00` and reproduce none of the arithmetic above, so an older week is worth checking rather than trusting as a model. Verify against the A/R balance instead.

## Posting

Fill the five lines, save, reload, then Approve and Close. Three checks decide whether an entry is right, and skipping any of them is how empty and unbalanced entries reach Approved:

1. **Read back every amount** from its cell after typing it. Compare numerically, since R365 renders `4` as `4.00`.
2. **Sum the lines before saving** and match both sides against the expected total. Sum the named rows only, because the footer row would double the count.
3. **Reload after saving**, and confirm the values survived. A save that never reached the server leaves every line at 0.00, and approving then commits an empty entry.

`scripts/post-entry.sh` does all of this for one store and refuses to approve anything that fails a check:

```bash
ENTRY_DATE=9/6/2026 scripts/post-entry.sh r365 Cookshop work.json
```

Run stores in parallel by giving each worker its own session name in the same directory. Two workers cover four stores in two rounds. See `scripts/work.example.json` for the work file's shape, which carries each line's comment and column alongside its amount. A line whose amount is 0 is skipped, which is what a store with no amendments wants.

Give the work file a Windows path such as the scratchpad directory. `post-entry.sh` reads it through `node`, which resolves `/tmp` against the drive root and fails on a path that bash resolves fine.

If the automated save will not land after a retry, re-enter the amounts, tell the human, and let them click Save, Approve, and Close.

## Backup on every entry

Every entry carries one PDF named `DoorDash <store> <MM.DD> backup.pdf`, where store is `Cookshop`, `Rosie`, `Shuka` or `Vic` and the date is the entry's. Page one is the tie-out: the entry as posted, the DoorDash figures closing to the net payout, D less the net payout against the posted A/R credit, D less Sales against the posted difference, and R365's debits to 104-05 by day. Page two is the payout's own detail page, cropped to its header and summary tiles.
`<skills>` is the repo's `.claude/skills` folder, written absolute since the run sits in a scratch directory. The page builder and capture live here; the GL day split and the PDF renderer are shared with `bowery-grubhub`, and the attach script with `bowery-payroll`.

1. **Capture** each payout in the DoorDash session, from the Payouts list or any open detail. It prints the detail header, which doubles as the covered-window check, and hides the Qualtrics survey popup before the shot:
   ```bash
   bash <skills>/bowery-doordash/scripts/backup/capture-payout.sh 615993619 shots/Cookshop.png
   ```
   Look at every capture before building, since an overlay that slips past the script covers the tiles.
2. **Read** each saved entry back: open `#/form/JournalEntryForm/<TransactionId>` and `eval "$(cat <skills>/bowery-doordash/scripts/backup/read-entry.js)"`, which returns `{status, date, location, lines}` with `lines` as `[account, debit, credit, comment]`.
3. **Build** one page per entry from a plan file: `{entryDate, store, location, status, lines, glDays, payout, png, note?}`. `glDays` is the location's object from `node <skills>/bowery-grubhub/scripts/backup/gl-days.js cells.txt` run on the Phase 2 report's cells (saved with the `grep -oE 'cell ...'` line in `R365-AUTOMATION.md`). `payout` is `{id, date, window, sales, commission, marketing, amendments, net}` at DoorDash's displayed signs. `node <skills>/bowery-doordash/scripts/backup/build-backup.js plan.json html/<store>.html` prints `ties` or `DOES NOT TIE`. Stop on the second.
4. **Render**: `bash <skills>/bowery-grubhub/scripts/backup/render-pdf.sh html <store> att/<store>/<pdf name> ...` prints each PDF's size. A file under 1 KB is a blank page.
5. **Attach**, with each PDF alone in its `att/<store>` folder: `bash <skills>/bowery-payroll/scripts/attach.sh r365 <TransactionId> att/<store>`. It deletes any attachment not in the folder, so list the entry's attachments first and leave an entry alone if it holds someone else's file. An Approved entry takes an upload and stays Approved.

## Verifying the run

Refilter the All Transactions grid and read every row back from the grid's data source, checking status is **Approved**, the amount matches the planned total for that store, and the `Attachment` field shows the backup PDF. Verify from the grid rather than from what the posting step reported, since a worker reports what it believes and the grid reports what R365 holds.

Report the table of stores, payout ids, amounts, totals, and backup attached, and report any store that failed just as plainly.

## Unattended run

`scripts/thursday-run.ps1` runs from Task Scheduler on Thursdays at 6:00 AM, with a retry at 10:00 AM (`scripts/register-task.ps1` sets up both). It takes the Monday to Sunday period that ended four days earlier, whose payouts are dated that Thursday. It starts this skill headless with a prompt beginning `Unattended run`, naming the period, the work directory, the entry date, the payout date and the stores to run. It writes `started.txt` in the work directory first, so a period runs once; `-Force` reruns it, and `-Date yyyy-MM-dd` stands in for today.

Thursday payouts can be missing from the list at 6:00. When the 6:00 attempt reports a store `no-payout`, or writes no result at all, the wrapper keeps its result as `result-first.json`, lists the waiting stores in `pending.json`, posts nothing, and the 10:00 attempt runs only those stores. It then merges both attempts into `result.json` and posts one card, tagging the mention, whatever the outcome. An attempt that starts at 10:00 or later posts its own result with no further retry.

No human answers during the run, so:

- Work only the stores the prompt names under `Stores`, and report only those in `result.json`.
- Never ask. `cd` into the work directory once, before opening any session, and run every command from there. Use session names `ddu` (DoorDash), `bdu` (journal entries) and `bdbu` (GL report), so an interactive run's sessions are left alone. Pass `DDS=ddu` to `capture-payout.sh`.
- A DoorDash two factor challenge or a rejected login fails the whole run: write `result.json` with the reason in `note` and post nothing.
- A store with no payout dated the payout date is `no-payout`, posted nothing, with its GL debits in `warnings` if it has any. A store with neither payout nor debits is left out.
- A covered window that disagrees with the store's GL days, a missing prior-period Bank Deposit, a payout that does not close to its net, or a backup that does not tie or did not attach goes in `warnings`. Post the store unless its figures fail **The arithmetic**.
- Per store, an Approved template at 0.00 is unapproved and filled, and an entry that already carries amounts is `skipped`. Approve only when every check in **Posting** passes; a store that fails one is `failed`, with the failing step in `warnings`, and the others carry on.
- Never correct an approved prior entry; report it.

Finish with **Verifying the run**, close the sessions by name, then write `result.json` in the work directory. The wrapper posts it to Teams through `scripts/notify-teams.ps1`, and reports a failure when the file is missing:

```json
{ "period": "9/28/2026 - 10/4/2026", "entryDate": "10/4/2026", "note": "",
  "stores": [ { "store": "Cookshop", "status": "approved", "amount": 960.33, "payout": "617964873", "transactionId": "...", "backup": true, "warnings": [] } ] }
```

`status` is `approved`, `skipped`, `no-payout`, `posted-unapproved`, or `failed`. The webhook lives in `~/.claude/bowery-doordash.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "<name>", "email": "<work email>"}, "mentionWhen": "always"}`. `mention` is optional; `mentionWhen` set to `always` tags every week, `attention` only on a failure, an unposted store, or a warning. `notify-teams.ps1 -DryRun` prints the card without posting.

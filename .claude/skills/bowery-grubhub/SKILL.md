---
name: bowery-grubhub
description: Post each week's Grubhub fees into the matching Bowery Group Restaurant365 journal entries, for one store or for all four in a batch, from Grubhub's order transactions for the period, with a tie-out and order list PDF attached to each, and a separate entry for the part of a period before month end. Use when asked to post or balance a Bowery Grubhub entry in R365, to pull a Bowery store's Grubhub period figures, or to check the Bowery A/R Grub Hub balance against a Grubhub deposit.
---

# Grubhub fees into a Bowery journal entry

Two phases. **Gather** every figure first, from Grubhub and from one GL report, then **post** the entries and attach their backup. Both phases read in bulk, so a four store run costs about the same reading as a single store.

Sessions:

```bash
playwright-cli -s=bgh open --headed https://restaurant.grubhub.com/login                    # Grubhub
playwright-cli -s=bj open --headed https://bowerygroup.restaurant365.com/react/accounting   # journal entries
playwright-cli -s=bb open --headed https://bowerygroup.restaurant365.com/react/accounting   # GL report
```

`scripts/backup/render-pdf.sh` opens and closes its own headless `bpdf` session.

`playwright-cli` binds sessions to the working directory. Stay in one directory for a whole run, and never `cd` mid run or the sessions vanish.

The NORMS skills use the default session plus `r365` and `r365b` in the same directory, and a NORMS run may still hold them open. Run `playwright-cli list` first and use the Bowery names above, so this run never navigates or logs out another company's browser. Close only the Bowery sessions when the run ends.

Keep working files in a per-run folder such as `.scratch/bgh<MMDD>/`.

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting any of this. R365 is a legacy Angular app whose grids and report dialogs ignore scripted input and fail silently, and every rule in that file was paid for with a wrong or empty entry. It is shared with the `bowery-ubereats` skill, so fix R365 platform behavior there once rather than in two places.

## The period

Bowery's Grubhub period runs **Tuesday to Monday**, so September's first period is 9/1 through 9/7. The journal entry is dated the **Sunday inside the period**, 9/6 for that one, and the GL report window is the period itself, 9/1 through 9/7.

The Uber Eats period is Monday to Sunday and its entry is dated the Sunday that ends the period. Carrying that habit here dates the entry 9/7 and reads a window one day off.

### Month end splits the period

Grubhub cuts every deposit at month end. A period that crosses into a new month settles as two deposits, so each part gets its own entry, read from its own sales window:

| Part | Sales window | Entry date | Deposit |
|---|---|---|---|
| Before month end | period start to the last day of the month | the last day of the month | paid the 1st, a day after month end |
| After month end | the 1st to the period's Monday | the Sunday inside the period, or the Monday when the month ended on that Sunday | paid the usual Wednesday |

Period 9/29 to 10/5 2026: a 9/30 entry for 9/29 to 9/30 (deposits `26100201...`, paid 10/1), then the 10/4 entry for 10/1 to 10/5 only. A month that ends on the period's Monday needs no split.

R365 pre-creates only the Sunday template, so the month-end entry has to be made. `scripts/duplicate-entry.sh <session> <prior entry id> <M/D/YYYY>` duplicates the store's previous GrubHub entry, sets the date and number, zeroes every line, saves, and prints the new id for the work file.

## Logins

Credentials live in `~/.claude/bowery-credentials.md`, outside any repo. Read them from there rather than asking the human. Missing or rejected credentials are the one case worth asking about.

Grubhub takes email and password at `restaurant.grubhub.com/login`. If it challenges with a mailed code, hand the keyboard over and say so. One Grubhub session serves the whole run.

R365 posts a username and password form at `identity.restaurant365.com`. `scripts/r365-login.sh <session>` logs in and is safe to re-run. Reach pages by clicking the home dashboard nav, since opening a `/react/...` URL drops the session; `R365-AUTOMATION.md` carries the detail.

## The four stores

R365 locations: `200 - Cookshop`, `500 - Rosie's`, `Shuka`, `Vic's`.

R365 writes Rosie's and Vic's with a curly apostrophe. Match locations on an ASCII fragment (`Rosie`, `Vic`) so shell quoting never has to carry the character.

Grubhub's picker names each store by street: `Cookshop - 10th Ave`, `Rosie's - E 2nd St`, `Shuka - MacDougal St`, `Vic's - Great Jones St`. A store with no Grubhub orders in the window is a real outcome: report it and post nothing for it.

## Phase 1: the Grubhub figures

The fees go in the week the orders were placed, so read them from Grubhub's order transactions, which carry each order's fees as soon as it closes. Deposit history only lists a period once Grubhub pays it, the Wednesday after, so a Tuesday run reading it finds nothing.

Once logged in, **read the figures from the API that Financials > Transactions calls**, through `eval` in the Grubhub session. `scripts/transactions.js` pulls every order for all four stores in one sales window, both days inclusive and in New York time, and totals each store in the shape a deposit carries:

```bash
sed -e 's/__START__/2026-10-06/g' -e 's/__END__/2026-10-12/g' .claude/skills/bowery-grubhub/scripts/transactions.js > .scratch/bgh<MMDD>/tx.js
playwright-cli -s=bgh eval "$(cat .scratch/bgh<MMDD>/tx.js)" | sed -n '/### Result/,/### Ran/p' | sed '1d;$d' > .scratch/bgh<MMDD>/orders.json
```

The call underneath:

```js
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const rests = JSON.parse(localStorage.getItem('associatedRestaurants'));   // id, displayName
// endDate is exclusive; the page sends America/Chicago, so pass New York to match R365's days
await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/v1/' + ids + '/transactions?timeZone=America/New_York&channelGroup=&startDate=2026-10-06&endDate=2026-10-13', {headers: H});
```

Each row is one transaction, in cents and signed as Grubhub shows them. `DISTRIBUTION` rows are Grubhub paying out an earlier period and are skipped. A `CS_CREDIT` is an account adjustment with no sale behind it, so it counts in the net but stays out of gross and the day buckets. Per store, `orders.json` (a JSON string to parse twice) carries:

| Field | Use |
|---|---|
| `total` | net, the deposit Grubhub will pay for the window |
| `T.prepaid_total` | gross sales, checks the arithmetic |
| `T.commission_total` | commissions (`advertising_fee` on each order) |
| `T.grubhub_delivery_fee_total` | delivery commissions |
| `T.processing_fee` | order processing fees |
| `T.account_adj` | Grubhub credits or debits outside any order |
| `days`, `odd`, `orders` | gross by New York day, the refund and credit rows, and every order for the backup |

Grubhub shows fees as negatives and they enter R365 as positive debits. The R365 template carries one line for each fee, so keep them apart rather than summing them.

Check each store before moving on: `check` is 0, meaning every signed field in `T` sums to `total`. A nonzero `account_adj` lands in the difference line, since no journal line models it. Record its order number for the report.

These figures match the deposit Grubhub pays the Wednesday after, to the penny on net and on each fee (checked against the 10/1-10/5 2026 deposits). An order Grubhub adjusts after the run settles in a later deposit and shows up then in the store's A/R balance.

Financials > Transactions, with the four stores and the window selected, shows the same totals by store in Chicago time, and is the fallback if the API refuses.

## Phase 2: the period debits

The daily journal entries debit `104-06 - A/R - Grub Hub` with each day's third party sales including tax. The period's debits, call this **D**, are what the entry clears.

`scripts/gl/gl-detail.sh` runs **GL Account Detail** in `bb` for `104-06 - A/R - Grub Hub` over the period, all locations, Subtotal By Location, Show Unapproved Yes, and saves it as CSV. Run it from the repo root; its snapshots land beside the CSV:

```bash
bash .claude/skills/bowery-grubhub/scripts/gl/gl-detail.sh bb 10/6/2026 10/12/2026 .scratch/bgh<MMDD>/gl.csv
node .claude/skills/bowery-grubhub/scripts/gl/gl-days.js .scratch/bgh<MMDD>/gl.csv > .scratch/bgh<MMDD>/gldays.json
```

It prints `saved <file>` or a `FAIL:` line naming the step, and checks the CSV header carries the account and window. `gl-days.js` gives each location's `D`, beginning balance `beg`, and Journal Entry debits by day in `days`, which the backup and any difference hunt both use. The manual path is Reports > My reports > Accounting > GL Account Detail > Customize with the same settings, reading each location's `Total A/R - Grub Hub` Debit.

The window is the period because Subtotal By groups only when the window holds detail rows. A window after the period holds none, so the report collapses to one ungrouped total.

Each location's block also shows a beginning balance, the prior period's net awaiting Grubhub's Wednesday deposit. On a Tuesday run that deposit has not landed yet, so its absence is expected.

## The arithmetic

The entry carries five lines, keyed by the comment R365 already holds on each template line. The a/r line says "payout" where Grubhub says deposit, so copy the comments verbatim:

```
credit "a/r debit from prior week less total payout"  =  D - net
debit  "commissions"                                  =  Commissions
debit  "delivery commissions"                         =  Delivery Commissions
debit  "order processing fees"                        =  Order Processing Fees
       "difference"                                   =  (D - net) - the three fees
                                                         debit if positive, credit if negative
```

The difference is the balancing plug, and it and the three fee lines all post to `632-02 - Delivery Fees`. It absorbs the gap between what R365 booked as third party sales and what Grubhub recorded, which runs to a few cents in a typical period. A figure in dollars rather than cents is worth understanding before approving.

To explain a dollar difference, set the store's `days` from `orders.json` and set it beside the store's daily Journal Entry debits in the GL report. Three causes have turned up:

- **Refunds.** `PCI_SINGLE_REFUND` rows reduce Grubhub's gross, and R365 still carries the original sale.
- **Account adjustments.** A `CS_CREDIT` raises the net with no sale behind it, pushing the difference toward a credit.
- **A day R365 overbooks.** R365's daily sales exceed Grubhub's orders for that day, usually an order Grubhub cancelled or has not settled yet. An unsettled order reverses in the next period.

Name the cause and amount per store in the report. Post with the plug, since the A/R balance still ties to the net.

**Do not use the account's beginning balance for the credit.** Beginning balance carries the prior period's net until Grubhub's deposit for it lands, and deposits sometimes lag or miss a period, pushing the whole undeposited receivable into the difference line and expensing it to Delivery Fees.

**Check the resulting A/R balance instead.** After the credit posts, the account's balance for that location should equal the net plus any earlier period still awaiting its deposit. This confirms the formula in one subtraction and works even in a period with no prior entry to compare against.

## Finding the entries

Bowery carries one Grubhub entry per period, dated the Sunday inside it, so the period Sep 1 - Sep 7 posts to the entry dated Sep 6.

Accounting > Transactions > All transactions, reached through the home dashboard's collapsed side menu (`R365-AUTOMATION.md` has the clicks). Filter Number (`Contains`) to `Grub`, which catches both `GrubHub` and `Grub Hub`, then harvest every entry and its id from the grid's data source in one call rather than clicking through rows. `R365-AUTOMATION.md` carries the call and the direct entry URL it feeds.

Each entry arrives as a template: five lines carrying accounts, comments, and location, every amount at 0.00. Templates arrive already Approved, since the 10/4/2026 period. **Read the comments off the first entry you open and use them verbatim** for the rest of the run, since the posting script keys every line by its comment text. Templates get reshaped between periods, so an entry from an earlier period is worth checking rather than trusting.

## Posting

Every entry for the period is unapproved first through the ribbon's Unapprove > Unapprove, whether it is a 0.00 template or already carries amounts, then its five lines are set to this run's figures, saved, reloaded, and Approved and Closed. Setting a line also clears its other column, so a difference that flips from debit to credit leaves nothing behind. Three checks decide whether an entry is right, and skipping any of them is how empty and unbalanced entries reach Approved:

1. **Read back every amount** from its cell after typing it. Compare numerically, since R365 renders `4` as `4.00`.
2. **Sum the lines before saving** and match both sides against the expected total. Sum the named rows only, because the footer row would double the count.
3. **Reload after saving**, and confirm the values survived. A save that never reached the server leaves every line at 0.00, and approving then commits an empty entry.

`scripts/post-entry.sh` does all of this for one store: it unapproves any Approved entry and prints the lines it held, overwrites every line, and refuses to approve anything that fails a check:

```bash
ENTRY_DATE=9/6/2026 scripts/post-entry.sh bj Cookshop work.json
```

Run stores in parallel by giving each worker its own session name. See `scripts/work.example.json` for the work file's shape, which carries each line's comment text alongside its amount.

If the automated save will not land after a retry, re-enter the amounts, tell the human, and let them click Save, Approve, and Close.

## Backup on every entry

Every entry carries one PDF named `GrubHub <store> <MM.DD> backup.pdf`, where store is `Cookshop`, `Rosie`, `Shuka` or `Vic`. Page one is the tie-out: the entry as posted, D less the net against the posted A/R credit, the three fees, the difference, R365 against Grubhub by day, the refund and adjustment rows, and a note naming the cause of any dollar difference. The pages after it list every Grubhub order in the window with its gross, three fees and net, from the same transaction data, totalled to the figures posted.

1. Restaurant ids, if a store needs checking on the Transactions page: Cookshop 2224512, Rosie's 2217880, Shuka 2221704, Vic's 2220039.
2. **Build** one page per entry from a plan file: `{entryDate, store, location, status, window, lines, glDays, orders, note}`. `lines` are read back from the saved entry as `[account, debit, credit, comment]`, `glDays` is the location's `days` from `gldays.json`, and `orders` is the store's record from `orders.json`. `node scripts/backup/build-backup.js plan.json <id>.html` prints `ties` or `DOES NOT TIE`. Stop on the second.
3. **Render**: `bash scripts/backup/render-pdf.sh <html dir> <id> <out.pdf> ...` serves the pages on localhost, since the browser blocks `file:` URLs, and prints each PDF's size. A file under 1 KB is a blank page.
4. **Attach** after approving: put each PDF alone in a folder under the working directory and run `bash .claude/skills/bowery-payroll/scripts/attach.sh bj <TransactionId> <folder>`. It deletes any attachment not in the folder, so list the entry's attachments first and leave an entry alone if it holds someone else's file.

## Verifying the run

Refilter the All Transactions grid and read every row back from the grid's data source, checking status is **Approved**, the amount matches the planned total for that store, and the `Attachment` field shows the backup. Verify from the grid rather than from what the posting step reported, since a worker reports what it believes and the grid reports what R365 holds.

Report the table of stores, Grubhub nets, amounts, totals, and backup attached, and report any store that failed just as plainly.

## Unattended run

`scripts/tuesday-run.ps1` runs from Task Scheduler on Tuesdays at 14:00 (`scripts/register-task.ps1` sets it up). It takes the period that ended the day before, Tuesday through Monday, with the entry dated that Sunday. It starts this skill headless with a prompt beginning `Unattended run`, naming the period, the work directory, and each part with its sales window and entry date. It writes `started.txt` in the work directory first, so a period runs once; `-Force` reruns it, and `-Date yyyy-MM-dd` stands in for today.

No human answers during the run, so:

- Never ask. Use session names `bghu`, `bju` and `bbu`, all from the repo root, so an interactive run's `bgh`, `bj` and `bb` are left alone.
- A Grubhub mailed-code challenge or a rejected login fails the whole run: write `result.json` with the reason in `note` and post nothing.
- Per store, the entry is unapproved, updated with this run's figures, saved and approved, whatever it held before. When it already carried amounts that differ from this run's, put the prior lines in `warnings`. For a part marked new entry, look on the All Transactions grid for a GrubHub entry at that date and location first, and update that one rather than duplicating. Approve only when every check in **Posting** passes; a store that fails one is `failed`, with the failing step in `warnings`, and the others carry on.
- A store with sales in R365 and no Grubhub orders in the window is `no-orders`, posted nothing, with the sales amount in `warnings`. A store with neither is left out.
- A difference in dollars, a missing prior-period Bank Deposit, or a backup that does not tie or did not attach goes in `warnings`, naming the cause when **The arithmetic** finds one. Post the store per the rules above.
- Never correct an approved prior entry; report it.

Finish with **Verifying the run**, close the three sessions by name, then write `result.json` in the work directory. The wrapper posts it to Teams through `scripts/notify-teams.ps1`, and reports a failure when the file is missing:

```json
{ "period": "9/29/2026 - 10/5/2026", "note": "",
  "entries": [ { "date": "10/4/2026", "window": "10/1-10/5",
      "stores": [ { "store": "Cookshop", "status": "approved", "amount": 184.16, "net": 1376.38, "transactionId": "...", "warnings": [] } ] } ] }
```

`status` is `approved`, `no-orders`, `posted-unapproved`, or `failed`. The webhook lives in `~/.claude/bowery-grubhub.json`, outside the repo: `{"teamsWebhook": "<url>", "mention": {"name": "<name>", "email": "<work email>"}, "mentionWhen": "always"}`. `mention` is optional; `mentionWhen` set to `always` tags every week, `attention` only on a failure, an unposted store, or a warning.

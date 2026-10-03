---
name: fare-grubhub
description: Post the weekly Grubhub fee journal entries into FARE Restaurant365, one per store, clearing 1103 Grubhub Deposit Clearing against delivery and processing fees, marketing and ad spend, promotions, refunds and withheld sales tax from each store's Grubhub deposits, with a backup PDF tying the entry to those deposits attached. Use when asked to post, balance, or approve the FARE GrubHub entries in R365, or to pull a FARE store's weekly Grubhub figures.
---

# FARE Grubhub fees, weekly by store

Each Grubhub period runs **Tuesday to Monday**. Each period posts one Journal Entry per store numbered `GrubHub`, dated the **Sunday inside the period**, header location the store, every line at the store. The period 9/1 to 9/7/2026 posts on 9/6/2026. Steps: **read** every store from Grubhub, **post** and check each entry, **attach the backup** to each, **approve** the week, then **close every window** the run opened.

Through August 2026 these were monthly entries, one per store, each with that store's Grubhub monthly statement attached. The August statements ran through Monday 8/31, so the first weekly period is 9/1 to 9/7.

Sessions, all from one working directory, since `playwright-cli` binds sessions to it:

```bash
bash <skill>/scripts/gh-login.sh fgh                               # restaurant.grubhub.com
bash <skill>/../fare-ubereats/scripts/r365-login.sh fghr           # fare.restaurant365.com
```

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365; the same build serves FARE.

## Logins

Credentials live in `~/.claude/fare-credentials.md`, outside any repo: R365 `tlaroche`, Grubhub `mark+33@ocra-us.com` with a password. `gh-login.sh` reads the Grubhub block. If Grubhub answers with a mailed code, hand the keyboard over and say so.

## Phase 1: read Grubhub

Read from the API the Deposit history page calls, inside the Grubhub session:

```bash
node <skill>/scripts/read-week.js 2026-09-01 2026-09-07 > rw.js
playwright-cli -s=fgh eval "$(cat rw.js)" > week.raw
node <skill>/scripts/build-lines.js week.raw 9/6/2026 > lines.json
```

`read-week.js` finds every deposit paid from the period start to 14 days past its end and pulls each in full. A period's deposit is paid the Friday after it (9/1 to 9/7 paid 9/11). `build-lines.js` keeps deposits whose orders fall in the period by New York date, and stops on a deposit that straddles the period, a transaction type outside `PCI_SINGLE_ONLINE`, `PCI_SINGLE_REFUND`, `MISC_CHARGE` and `CS_CREDIT`, or a deposit whose fields do not add to its total.

`scripts/stores.json` maps the 13 Grubhub restaurants to the ten R365 locations. The three GO stores (Loop GO, Logan GO, Northwestern GO) roll into their parent store's entry.

## The lines

| Grubhub field | GL | Comment |
|---|---|---|
| Deliveries by Grubhub + order processing | Dr 7350 - Grubhub Third Party Fees | `delivery + order processing` |
| Marketing commission + account adjustments (daily Ad Spend, less Grubhub credits) | Dr 7570 - Grubhub Marketing | `marketing + ad spend` |
| Restaurant funded promotions and rewards | Dr 4905 - Third Party App Marketing Comps | `restaurant promotions` |
| Refunds (`PCI_SINGLE_REFUND`, full prepaid amount) | Dr 7535 - Third Party Refunds | `cancellations + order adjustments` |
| Withheld sales tax | Dr 2270 - Sales Tax Payable | `sales tax withheld` |
| total of the above | Cr 1103 - Grubhub Deposit Clearing | `orders 9/1 - 9/7, deposit <id>` |

The check: the lines equal the period's order prepaid amounts less the deposit, which is what Grubhub kept from what the DSS booked to 1103. These match the line names on the monthly statement, and Logan Square's August entry ties to them to the penny.

A store with no orders still gets its entry, every line at 0.00 and the header and line comments `no sales this week`. R365 keeps a stale header Amount on an all-zero entry, so read the lines.

## Phase 2: post

```bash
bash <skill>/scripts/post-store.sh fghr lines.json "Logan Square" <source TransactionId>
```

The source is the store's prior week `GrubHub` entry. For 9/6/2026 it was the store's 8/31 monthly. Oak Park had no prior entry: give it any store's entry and the script moves the copied lines to Oak Park. R365 asks "transaction only" when the source holds an attachment; `scripts/duplicate.sh` answers it, so the copy never takes the source's backup. The script duplicates the source (transaction only) and saves the copy with the date and number, then sets the header location, trims, adds and sets lines, saves, reloads, and prints the `check-lines.js` table. Read `MATCH` for each store. Close the extra tabs between stores, since `duplicate.sh` picks the newest copy tab.

The copy is saved before any line is set, so a failure after the duplicate step leaves a copy holding the source's amounts. Finish it in place with `REDO=<id> post-store.sh ...` rather than duplicating again.

## Phase 3: attach the backup

Every entry carries one PDF named `GrubHub <store> <MM.DD> backup.pdf`, zero stores included. Page one is the tie-out: the entry as posted, each deposit's Grubhub fields mapped to the entry's GLs against the posted lines, and prepaid orders less the deposit total against the 1103 credit. The pages after it are Grubhub's own deposit pages, one per deposit, captured from Financials > Deposit history, since that page has no download. A zero store's pages are its empty deposit history over the Tuesday to Monday after the period, when its deposit would have been paid, then the location picker showing that store checked.

```bash
bash <skill>/scripts/backup/backup-week.sh fgh fghr week.raw ids.txt
```

`ids.txt` holds one `store|TransactionId` line per store, from each `post-store.sh` `id` line. The script reads every entry back from R365, captures each deposit its 1103 comment names, builds each page, prints `ties` or `DOES NOT TIE` per store, renders the PDFs and attaches them. Work lands in `backup-<period start>/`. A store that does not tie gets no attachment and the script ends on `STOP`; find the cause before approving. A rerun skips captures already taken and entries already holding their file, so rerun it after fixing a store.

The attachment lands on approved entries too, so a backup missed on an approved week goes on without unapproving.

## Phase 4: approve

Once every store reads `MATCH`, zero stores included, approve the week in bulk from Accounting > Transactions > All transactions:

1. Filter **Number** to `GrubHub` and **Approval Status** to `Unapproved`. Status alone would also select other unapproved FARE entries, such as Uber Eats or DoorDash.
2. Read the grid before selecting. Every row must be one of this run's `GrubHub` entries, dated a Sunday this run posted. Stop and ask on anything else.
3. Click the select-all box in the header next to Approval Status.
4. Edit Selected > Approve.

Approving through each entry's ribbon (`../fare-ubereats/scripts/approve.sh`) takes about a minute per entry, so keep it for a single store.

## Verifying the run

All Transactions, filter Number to `Grub` and read the grid's data source (see `R365-AUTOMATION.md`): ten `GrubHub` rows on the Sunday, one per store, each at its store with the planned amount. Every row reads Approved, and its `Attachment` field shows the backup. Report the store table with deposit IDs and backup attached, and every zero store.

## Finish

Every run ends by closing all of its windows, the Grubhub window and the R365 window, after approval or after a stop:

```bash
playwright-cli -s=fgh close
playwright-cli -s=fghr close
playwright-cli list    # neither fgh nor fghr may remain
```

Other FARE skills run their own sessions on the same machine, so never use `kill-all` or `close-all`. After stopping a background loop, confirm with `ps` that its child scripts are gone before touching the browser again.

---
name: fare-doordash
description: Post the weekly DoorDash fee journal entries into FARE Restaurant365, one per store, clearing 1102 DoorDash Deposit Clearing against commission, marketing fees, store-funded discounts and error charges from DoorDash's weekly financial report, with the store's payout attached. Use when asked to post, balance, or approve the FARE DoorDash entries in R365, or to pull a FARE store's weekly DoorDash figures.
---

# FARE DoorDash fees, weekly by store

Each week, Monday to Sunday, posts one Journal Entry per store numbered `DoorDash`, dated the **Sunday**, header location the store, every line at the store, with that store's payout CSV attached. Two phases: **read** the week's DoorDash report, then **post**.

Through August 2026 these were monthly entries, one per store, each with that store's DoorDash monthly statement PDF attached. The first weekly entry is dated 9/6/2026 and covers 9/1 to 9/6, since 8/31 sat in the August monthly. Every later week is the full Monday to Sunday.

Sessions, all from one working directory, since `playwright-cli` binds sessions to it:

```bash
bash <skill>/scripts/dd-login.sh fdd2                       # DoorDash merchant portal
bash <skill>/../fare-ubereats/scripts/r365-login.sh fdd     # fare.restaurant365.com
```

Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) before scripting R365; the same build serves FARE.

## Logins

Credentials live in `~/.claude/fare-credentials.md`, outside any repo: R365 `tlaroche`, DoorDash `mark+33@ocra-us.com` with a password. `dd-login.sh` reads the DoorDash block and logs in through `identity.doordash.com`. If it stops on a mailed code, hand the keyboard over and say so. Both browsers can close mid run; re-run the login scripts and carry on.

## Phase 1: read DoorDash

DoorDash pays each Monday to Sunday week the following **Thursday**, one payout per store, so the week ending 9/6 is the 9/10 payout.

**Overlays swallow real clicks on this portal.** The DoorDash Assistant chat panel and a "reports in one place" intro dialog sit over the page and every `click` times out on them. Collapse the chat (`button "Collapse Chat"`) and close the dialog first. Nav buttons that still time out take an `eval` click: `[...document.querySelectorAll('button')].find(e=>e.innerText.trim()==='Financials').click()`.

```bash
bash <skill>/scripts/dd-report.sh fdd2 9/17/2026 w0913
node <skill>/scripts/build-lines.js w0913 9/13/2026 > lines.json
node <skill>/scripts/split-payouts.js w0913 w0913/att
```

The 9/6/2026 week alone passes `--from 2026-09-01`, which drops the 8/31 rows from the 9/10 payout. Without `--from`, `build-lines.js` stops on any row dated outside the week. It also stops on an unknown store, a store whose detail does not add to its payout net, and on Adjustments or tax passed to the store, which the entry does not model. `scripts/stores.json` maps DoorDash Store IDs to R365 locations; map by ID, since DoorDash store names change.

`dd-report.sh` goes Financials, a payout row, **Create report**, keeps **All stores (10)**, **By payout date** and all four CSVs, picks the Thursday from the payout date menu, then waits on the Reports page for the row's **Download**, downloads the zip and unzips it. The Download button appears early with a Loading spinner inside it, and a click then fetches nothing. The menu offers only payouts that exist, so a week is readable from its Thursday on.

`split-payouts.js` writes each store's row of the payout summary to `DoorDash payout <date> <store>.csv`, the file attached to its entry.

## The lines

| DoorDash columns | GL | Comment |
|---|---|---|
| total of the below | Cr 1102 - DoorDash Deposit Clearing | `total withheld from payouts` |
| Customer discounts (funded by you, by DoorDash, by a third party) + DoorDash marketing credit + Third-party contribution | Dr 4905 - Third Party App Marketing Comps | `customer discounts funded by store` |
| Marketing fees | Dr 7540 - Doordash Marketing | `marketing fees` |
| Commission + Payment processing fee | Dr 7310 - DoorDash Third Party Fees | `commission` |
| Error charges | Dr 7535 - Third Party Refunds | `error charges` |

The DoorDash-funded discounts and the marketing credit offset each other, so 4905 is in effect what the store funded. When DoorDash's credit covers a marketing fee, the credit lands in 4905 and the fee stays in 7540; the August monthlies booked it the same way. The check: the lines equal Subtotal less Net total. Sales tax stays off these entries; DoorDash remits it as marketplace facilitator.

A store with no sales still gets its entry, every line at 0.00 and the header and line comments `no sales this week`, with no attachment, since it has no payout. Riverside closed 7/26/2026 and stays in the run until the human drops it.

## Phase 2: post

```bash
bash <skill>/scripts/run-week.sh fdd lines.json w0913/att sources.txt ids0913.txt
```

`sources.txt` holds one `store|TransactionId` per line, each store's prior week `DoorDash` entry. `run-week.sh` writes the same shape to its last argument for every store it approves, so this week's ids file is next week's sources. For each store it logs in again, closes extra tabs, runs `post-store.sh`, then attaches the store's payout CSV with `attach.sh` and approves with `approve.sh`, each step gated on the one before: `MATCH`, then `attached`. The zero store has no attachment and is approved once its read-back shows `no sales this week` on every line. A store that fails prints `FAIL`, its id if a copy exists, and stays unapproved.

`post-store.sh` duplicates the source (transaction only) and saves the copy with the date and number, then sets the header location, trims, adds and sets lines, saves, reloads, and prints the `check-lines.js` table. A source with no attachments, such as the zero store's, skips R365's "transaction only" question and opens the copy tab directly. A failure after the duplicate step leaves a saved copy holding the source's amounts; finish it in place with `REDO=<id> post-store.sh ...` rather than duplicating again.

A run stopped mid store can still have finished that store. Read the week's rows in All Transactions before redoing anything.

For 9/6/2026 the sources were the 8/31 monthlies:

| Store | 8/31 TransactionId |
|---|---|
| Riverside | `cba26077-daef-4574-aef5-9b8b89e5ebb1` |
| Loop | `0c36ccf2-9bd1-4ad5-9a4b-a321881403aa` |
| LaSalle | `0d89cafd-2f02-4f46-a05e-776ad2549b9a` |
| Logan Square | `9e94f40a-a8f5-45e6-9910-aaf91e93875d` |
| Northwestern | `3ae9ec00-6141-4f78-a46e-d529f6d3f559` |
| Oak Park | `3aa9da7d-415f-4bf1-9df5-08dd4e98198d` |
| Old Post Office | `b98b9d0a-a16c-484b-896e-08550cc34553` |
| Sterling | `788aacbf-7d86-4261-81c6-b7c69a3b14c9` |
| Lakeview | `fbeddc2d-98b2-43d1-a65d-5b63018bbfbe` |
| Old Town | `a50f5ad5-aa37-419e-8672-60480ba0f8fd` |

## Verifying the run

All Transactions, filter Number to `Door` and read the grid's data source (see `R365-AUTOMATION.md`): ten `DoorDash` rows on the Sunday, one per store, each Approved at its store with the planned amount and its payout CSV attached. Report the store table with payout IDs, and every zero store.

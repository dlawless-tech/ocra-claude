---
name: sink-doordash-review
description: Review and correct The Sink's DoorDash journal entries in Restaurant365 (journeygroup) against DoorDash payouts and the 13562 Door Dash - Receivable GL, one entry per DoorDash Monday-to-Sunday week, then post any missing weeks. Use when asked to review, correct, catch up, or post the Sink DoorDash entries, or to tie out Sink 13562 to DoorDash.
---

# Sink DoorDash review and corrections

The Sink books DoorDash sales to `13562 - Door Dash - Receivable` through each day's Daily Sales Summary, DoorDash pays the week out on Thursday, and the deposit lands in the bank on Friday. One journal entry per DoorDash week clears the gap between the two to fees, sales tax and marketing. The account **ties** when its balance at the end of each Sunday equals that week's net payout.

Work from one fixed scratch folder for the whole run, since `playwright-cli` binds sessions to the folder. Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for R365 grid habits. Scripts are in `scripts/`; logins come from `~/.claude/sink-credentials.md`.

```bash
bash <skill>/scripts/r365-login.sh sink    # R365, user tlaroche
bash <skill>/scripts/dd-login.sh sdd       # DoorDash merchant portal, mark+12 (no code asked on 10/14/26)
```

## The entry

Numbered `DoorDash MM.DD-MM.DD` for the Monday-to-Sunday week, dated the **Sunday**, location `10200 - The Sink`, header comment equal to the number.

| Line | Account | Amount |
|---|---|---|
| Commission & Fees + Amendments | 74910 Door Dash Fees | DoorDash Commission & fees less Amendments (an amendment charge adds to the fee) |
| Sales Tax | 22000 Sales Tax Payable | R365 DSS sales for the week less DoorDash Sales |
| Marketing Fee | 78000 Marketing Expenses | DoorDash Marketing spend |
| AR Doordash | 13562 credit | R365 DSS sales less DoorDash Net total |

The Sales Tax line is a plug, so it carries any DSS error. It normally runs about 9.3% of DoorDash Sales; a week far off that rate points to a DSS day that is wrong, which is reported rather than buried. `scripts/plan.js` builds the plan with its number, stops when DoorDash's tiles fail to close to net, and prints the rate.

Post a week once DoorDash shows its figures; the deposit does not need to be in R365 yet.

## Review

1. **GL.** `bash scripts/gl-detail.sh sink <start> <end> gl.csv` (`ACCT=` names another account; it defaults to 13562), then `node scripts/gl-parse.js gl.csv gl.json`. Start at least five weeks back, on a Monday. Show Unapproved is Yes, since an unapproved DSS is a real day of sales.
2. **Weeks.** `node scripts/weeks.js gl.json <first Monday> <last Sunday>` prints each week's DSS sales, the Friday deposit, the fee that implies, the fee booked by entries dated in the week, the difference, and the balance at the end of Sunday. It also lists manual NJ entries carrying a comment, such as an AR true up.
3. **DoorDash.** On Financials > Payouts, `bash scripts/dd-payout.sh sdd <payout id>` prints a paid payout's covered window and tiles. For a week still pending, go to Financials > Transactions and run `bash scripts/dd-range.sh sdd <Monday> <Sunday>`. The covered window can end before Sunday when the store is closed; the payout still belongs to the week it falls in.
4. **Entries.** On All Transactions, `playwright-cli -s sink eval "$(node scripts/list-entries.js door)"` lists every DoorDash entry with its id; open one at `#/form/JournalEntryForm/<id>` and read it with `scripts/read-entry.js`.

The review is done when every week in range has exactly one entry, each entry's lines match DoorDash and the table above, and every Sunday balance equals that week's net payout (or the sum of payouts still unpaid). Report each week that fails, with the amount and its cause.

## Corrections

Leave entries in a closed period as they are. A save into a closed period fails with `The date of this transaction is in a fiscal period that is closed`. Book the fix in a separate `DoorDash Correction` entry dated the first open day, with one commented line per fix.

- **Wrong lines on an open entry.** Build the plan with `plan.js`, then rewrite in place: `EDIT=<id> bash scripts/enter-entry.sh sink plan.json "The Sink|<Sunday>"`. Unapprove an approved entry first with `bash scripts/unapprove.sh sink <id>`.
- **Wrong number or date.** `bash scripts/redate.sh sink <id> <Sunday> "<number>"`.
- **Duplicate.** Open it, click **Action** then the menu's enabled **Delete** (the ribbon's Theme Builder Delete is disabled), and answer **Yes**. Confirm it is gone from All Transactions.
- **Missing week.** `bash scripts/enter-entry.sh sink plan.json "The Sink|<Sunday>"`, with `source` in the plan set to any DoorDash entry, which is duplicated. The plan carries the entry number; `NUM=` overrides it. Duplicate writes an NJ-numbered copy dated today the moment it is clicked, so a failed run leaves one behind: finish it with `EDIT=<that id>` or delete it.

Every script leaves its entry Unapproved. Approve when the user says so with `bash scripts/approve.sh sink <id>...`, then confirm **Approved** on All Transactions and rerun the review to confirm the account ties.

Close the sessions by name when finished: `playwright-cli -s sink close` and `playwright-cli -s sdd close`.

## DoorDash portal

- An Instagram promo popover (`[data-testid=entry-point-popover]`) intercepts clicks; both DoorDash scripts close it first.
- The Payouts list cells never settle for a real click; `dd-payout.sh` opens them with a DOM click and returns with browser back.
- The custom date picker opens on whatever month it last showed; `dd-range.sh` navigates to each date's month before clicking.
- Payouts list only the last 30 days. Older weeks come from `dd-range.sh`.

## History

Before 9/7/2026 entries were numbered for a Wednesday-to-Tuesday week and dated about nine days after the DoorDash week they covered. On 10/14/2026 the entries from 9/7 on were moved to DoorDash weeks and the account tied through 10/11/2026. The approved `DoorDash 09.02-09.08` entry dated 9/7 sits in a closed period; it under-credited 13562 by 1,384.71 to absorb an old shortfall and booked 8/24-8/30 fees as 287.79 against DoorDash's 587.79. `DoorDash Correction` dated 9/9/2026 fixes both. The old shortfall came from a 587.03 `true up of a/r` on 12/30/2025 and fee entries booked over sales less deposits between 9/2025 and 6/2026.

---
name: sink-grubhub-review
description: Review and correct The Sink's Grubhub journal entries in Restaurant365 (journeygroup) against Grubhub's order transactions and payouts and the 13580 Grub Hub - Receivable GL, one entry per Grubhub period, then post any missing periods. Use when asked to review, correct, catch up, or post the Sink Grubhub entries, or to tie out Sink 13580 to Grubhub.
---

# Sink Grubhub review and corrections

The Sink books Grubhub sales to `13580 - Grub Hub - Receivable` through each day's Daily Sales Summary. Grubhub pays each period on the Wednesday after it, and the deposit lands in the bank on Friday. One journal entry per Grubhub period clears the gap to fees and sales tax. The account **ties** when its balance at each period end equals the Grubhub payouts not yet deposited in R365.

A **period** runs Tuesday to Monday in Denver days and splits at month end, and Grubhub pays each piece separately: 9/29-9/30 and 10/1-10/5 were two payouts.

This skill shares the R365 scripts in [`../sink-doordash-review/scripts`](../sink-doordash-review/scripts) (login, GL detail, entry edits, approve, unapprove, list, read); its own `scripts/` hold the Grubhub side. Work from one fixed scratch folder for the whole run, since `playwright-cli` binds sessions to the folder. Logins come from `~/.claude/sink-credentials.md`.

```bash
bash <dd>/r365-login.sh sink          # <dd> = .claude/skills/sink-doordash-review/scripts
bash <skill>/scripts/gh-login.sh sgh  # Grubhub for Restaurants, todd+1 (no code asked on 10/14/26)
```

## The entry

Numbered `GrubHub MM.DD-MM.DD` for the period, dated its last day, location `10200 - The Sink`, header comment equal to the number.

| Line | Account | Amount |
|---|---|---|
| `GrubHub MM.DD-MM.DD` | 74920 GrubHub Fees | Grubhub's commission, delivery, processing and other fees, plus any promo or account credit |
| `GrubHub MM.DD-MM.DD` | 13580 credit | R365 DSS sales for the period less Grubhub's net |
| `Sales tax` | 22000 Sales Tax Payable | sales tax Grubhub withheld, plus pennies of DSS-over-gross rounding |
| `Refund O-<order> not in DSS` | 74920 GrubHub Fees | only when the period has a refund: R365 DSS less Grubhub gross |

Post a period once it has ended; Grubhub's figures are final as orders close, so the payout does not need to have landed.

## Review

1. **Grubhub.** `bash scripts/gh-transactions.sh sgh <start YYYY-MM-DD> <end exclusive> gh.json` reads every order, refund and payout from the accounting API behind Financials > Transactions. Start on a Tuesday at least five periods back.
2. **GL.** `ACCT="13580 - Grub Hub - Receivable" bash <dd>/gl-detail.sh sink <start> <end> gl.csv`, then `node <dd>/gl-parse.js gl.csv gl.json`.
3. **Periods.** `node scripts/periods.js gh.json gl.json <from YYYY-MM-DD> --plan plan.json --source <any GrubHub entry id>` prints each period's DSS, Grubhub gross, fees, withheld tax, refunds, net, the payout that settled it, the entries dated in it, and 13580 at period end against what is still unpaid, marked `TIES`, `OFF` or `OPEN` (period not over). It writes one plan per period. A `WARN` line means DSS and Grubhub gross differ with no refund to explain it: a DSS day is wrong, and that is reported rather than posted around.
4. **Entries.** On All Transactions, `playwright-cli -s sink eval "$(node <dd>/list-entries.js grub)"` lists every GrubHub entry with its id; read one with `<dd>/read-entry.js`.

The review is done when every ended period has exactly one entry matching its plan and every one reads `TIES`. Report each period that fails, with the amount and its cause.

## Corrections

Leave entries in a closed period as they are. A save into a closed period fails with `The date of this transaction is in a fiscal period that is closed`. Book the fix in a separate `GrubHub Correction` entry dated the first open day, with one commented line per fix. Check the balance at the cutoff after that day's DSS has posted, since a same-day DSS lands after the entry in the GL listing.

- **Wrong lines, number or date on an open entry.** `bash <dd>/unapprove.sh sink <id>`, then `EDIT=<id> bash <dd>/enter-entry.sh sink plan.json "The Sink|<period end>"`, which rewrites lines, number, date and comment from the plan.
- **Duplicate.** Open it, click **Action** then the menu's enabled **Delete**, and answer **Yes**. Confirm it is gone from All Transactions.
- **Missing period.** `bash <dd>/enter-entry.sh sink plan.json "The Sink|<period end>"` duplicates the plan's `source` entry. A failed run leaves an NJ-numbered copy dated today: finish it with `EDIT=<that id>` or delete it.

Every script leaves its entry Unapproved. Approve when the user says so with `bash <dd>/approve.sh sink <id>...`, confirm **Approved** on All Transactions, and rerun the review to confirm every period ties.

Close the sessions by name when finished: `playwright-cli -s sink close` and `playwright-cli -s sgh close`.

## History

Before 9/8/2026 entries were numbered for a Wednesday-to-Tuesday week and did not follow Grubhub's figures. On 10/14/2026 the entries from 9/8 on were rebuilt on Grubhub periods and the account tied through 10/12/2026. The approved `GrubHub 09.02 09.08` entry dated 9/7 (closed period) moved 3,149.00 from 13580 to 12000 Accounts Receivable: 2,679.60 for two 1,339.80 "ACH DEBIT RECEIVED - Cust ID: ST" bank expenses coded to 13580 (014551 on 7/29, 014630 on 8/31), plus 469.40 of earlier Grubhub fees never booked. `GrubHub Correction` dated 9/9/2026 moved that 469.40 to 74920. As of 10/14/2026 the user had not said what the ST debits are, so the 2,679.60 still sits in 12000.

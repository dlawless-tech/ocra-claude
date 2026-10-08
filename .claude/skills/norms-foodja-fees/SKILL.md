---
name: norms-foodja-fees
description: Post the NORMS Foodja Fees journal entries into Restaurant365, one per store that has a Foodja statement for the two-week period, clearing 1119 Foodja Receivable to the statement's Amount Due against 5514 Online Ordering Expense and 5915 Delivery over Short, with the statement PDF attached. Use when asked to post, balance, or approve the NORMS Foodja entries in R365, to pull NORMS Foodja statements, or to check 1119 against a Foodja payment, or when the Friday scheduled run starts it.
---

# Foodja statements into the NORMS Foodja Fees entries

Three steps: **read** the period's Foodja statements and the 1119 GL detail, **plan** each store's lines with `plan.js`, then **post** one entry per store. Only stores with a statement for the period get an entry.

Run from one directory for the whole run, `.scratch/norms-foodja-fees/p<MMdd of period end>`. `playwright-cli` binds sessions to the working directory, and a `cd` mid run strands them. `<skill>` below is this folder, written absolute.

```bash
bash <skill>/scripts/fj-login.sh nfj     # Foodja Restaurant Partner Portal
bash <skill>/scripts/r365-login.sh nfr    # R365, entries
bash <skill>/scripts/r365-login.sh nfrb   # R365, GL report
```

Read [`../norms-ubereats/R365-AUTOMATION.md`](../norms-ubereats/R365-AUTOMATION.md) before scripting R365. It is shared with the other NORMS skills, so fix R365 platform behavior there.

## Logins

Credentials live in `~/.claude/norms-credentials.md` under `## Foodja` and the R365 block. Foodja logs in with `mark@ocra-us.com` in two steps, email then password, and asks for no code.

## The period

Foodja statements cover **two weeks, Monday to Sunday**, numbered by period (P19 is 8/31/2026 to 9/13/2026). Periods close every other Sunday: 9/13, 9/27, 10/11/2026 and on. Foodja pays the Amount Due about eleven days after close, and the bank deposit lands on 1119 as `Foodja PAYMENTS <billing code> NTE*P<n>` on a Friday (P19 on 9/25).

The entry is dated the **period's last day**, numbered `Foodja Fees`, one per store.

## Read

**Statements.** Accounting & Payments > Statements lists one PDF per store per period, named `Foodja Statement <period> <billing code>.pdf`, with a Through Date column. A store with no orders in the period has no statement and gets no entry.

```bash
bash <skill>/scripts/statements.sh nfj <period end M/D/YYYY> .
```

It downloads that Through Date's PDFs into `statements/` and writes `statements.json`: per store the billing code, its orders, **Restaurant Total** (the order's sales) and **Amount Due** (what Foodja pays). The parse checks the orders sum to the statement totals. It prints `none` when Foodja has not posted the period yet.

**R365 sales, D.** The daily journal entries debit `1119 - Foodja Receivable` with each Foodja order. A store's period debits are **D**. In `nfrb`, Reports > My reports, GL Account Detail card, Customize. With the dialog open, `eval "$(cat <skill>/scripts/gl-params.js)"` sets the account to 1119 and Subtotal By to Location and returns every parameter. Fill Start and End with the period's first and last day against fresh snapshot refs, click the dialog's Run (`exportMenu`), then on the report tab:

```bash
bash <skill>/scripts/snapshot.sh nfrb gl.txt
grep -oE 'cell "[^"]*"' gl.txt | sed 's/^cell "//; s/"$//' > gl.cells
node <skill>/scripts/gl-parse.js gl.cells > gl.json
```

**Source entries.** Each new entry is a Duplicate of the store's latest Foodja Fees entry; the 8/30/2026 entries are the first per-store set. In `nfr`, soft navigate to All Transactions from the home dashboard and `eval "$(cat <skill>/scripts/sources.js)"`, which prints every Foodja entry newest first as `date|location|TransactionId|status|amount`. A store with none (Orange and La Cienega before 9/13/2026) copies `stores.json` `_source`, and the post sets the store's location on the entry header and every line, then checks both after reload.

## Plan

```bash
node <skill>/scripts/plan.js statements.json gl.json <period start> <period end> > plan.json
```

| Comment | GL | Amount |
|---|---|---|
| `a/r foodja - payout` | Cr 1119 - Foodja Receivable | D - Amount Due |
| `foodja fees` | Dr 5514 - Online Ordering Expense | Restaurant Total - Amount Due |
| `difference` | 5915 - Delivery over Short | D - Restaurant Total, debit if positive, credit if negative |

After the entry the store's 1119 balance for the period equals the Amount Due, and the payment deposit clears it. Fees run about 27% of Restaurant Total.

`plan.js` pairs each statement order with a 1119 debit of the same date and amount and prints every store that does not tie, naming the orders missing from R365 and the R365 days with no order. P19 had four: Orange's 9/8 order (207.17) and South Torrance's 9/4 order (125.47) never reached R365, Downey's 8/31 order (338.97) was missing, and Huntington Beach and Santa Ana each booked a different amount than Foodja's. The difference line carries these and the entry still posts; report them as sales questions for the human.

`stores.json` maps billing code to R365 location and location id, plus the three account ids. Billing codes follow the store: `1NORMS` alone is Orange, `1NORMSLA` is La Cienega, `1NORMSRIA` is Rialto, `1NORMSSTR` is South Torrance, `1NORMSNTR` is North Torrance. `plan.js` stops on a code it does not know.

A credit on 1119 already dated the period end means the period is posted; `plan.js` marks it `POSTED` and that store is skipped.

## Post

```bash
bash <skill>/scripts/post-entry.sh nfr plan.json <code> <period end> statements <source TransactionId>
```

One store per call: Duplicate the source, answering R365's Duplicate Confirmation with **No, transaction only** so the source's statement stays behind (the copy saves as `NJ...` at once), set date and number, set the lines through the Kendo model (adding the third row the 8/30 entries lack), save, read the `SaveTransaction` body, reload and read back every line, approve from the `Transaction/Approve` response, then attach the store's statement PDF with `attach.sh`. It prints `<code> DONE <id> <amount>`. A failure after Duplicate leaves an `NJ` copy; rerun with `COPY=<its TransactionId>` in front to finish that copy in place of a new one.

## Verify

Re-run the GL report through the payment Friday and check each posted store's period balance equals its Amount Due, and once the deposit lands, that it clears to zero. Report the store table: amount, Amount Due, difference, and every warning.

## Close

Close the sessions this run opened, by name: `for S in nfj nfr nfrb; do playwright-cli -s=$S close; done`. Leave every other session alone.

## Unattended run

`scripts/friday-run.ps1` runs from Task Scheduler on Fridays at 7:00 with a 13:00 retry (`scripts/register-task.ps1` sets it up). It works every period that closed at least five days earlier, from the 9/27/2026 period on, that has no `done.txt` in its work directory, oldest first. It starts this skill headless with a prompt beginning `Unattended run` that names the period, the work directory and the entry date.

No human answers during the run, so:

- `cd` into the work directory once, before opening any session, and run every command from there. Use session names `nfju` (Foodja), `nfru` (entries) and `nfrbu` (GL report).
- Never ask. A rejected login fails the run: write `result.json` with the reason in `note`.
- When `statements.sh` prints `none`, write `result.json` with `"stores": []` and `"note": "no statements posted yet"` and stop. The wrapper stays silent at 7:00, posts a waiting card at 13:00, and the next Friday tries again.
- A store already `POSTED` is `skipped`. A store whose post fails a check is `failed`, with the failing step in `warnings`, and the others carry on. Every `plan.js` warning goes into that store's `warnings`; the entry still posts.

Finish with **Verify**, close the sessions by name, then write `result.json` in the work directory. The wrapper posts it to Teams through `scripts/notify-teams.ps1` and marks the period done:

```json
{ "period": "9/14/2026 - 9/27/2026", "entryDate": "9/27/2026", "note": "",
  "stores": [ { "store": "217 - Anaheim", "status": "approved", "amount": 69.65, "fee": 69.65, "due": 188.30, "transactionId": "...", "warnings": [] } ] }
```

`amount` is the entry's debit side and `fee` its 5514 line. `status` is `approved`, `skipped` or `failed`. The webhook lives in `~/.claude/norms-foodja.json`, outside the repo, with the same shape as the DoorDash one: it posts to the NORMS TPD channel and tags Regina Leong every run. `notify-teams.ps1 -DryRun` prints the card without posting.

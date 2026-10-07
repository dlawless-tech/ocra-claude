---
name: frankies-event-deposits-recon
description: Reconcile Frankies 457's event deposits and Tripleseat receivable in Frankie's Spuntino Restaurant365, week by week, keeping that week's tab of the Event Deposits & Tripleseat Receivable workbook tied to the GL and recoding Tripleseat event entries or bank deposits that book a payment to the wrong account. Use when asked to run the Frankies event deposit recon, update the Frankies 457 event deposits spreadsheet, or fix Frankies 2015 Event Deposits or 1242 Tripleseat Receivable.
---

# Frankies 457 event deposit recon

Three records have to agree for every day:

- the GL: **2015 Event Deposits** (a credit balance) and **1242 Tripleseat Receivable**, location 1000 - Frankies 457;
- the week's tab of the workbook, whose deposit total (`D`) must equal the GL 2015 balance and whose receivable total (`I`) must equal the GL 1242 balance on the same date;
- the entries behind them: Tripleseat **event entries** and **bank deposits**.

**Event entries** are journal entries numbered `Events - <event>`, one per Tripleseat invoice, dated on the event date. The Tripleseat sync posts them, sales and tax included. Each applied deposit is a 2015 debit commented `Deposit MM/DD/YY : <method>`. The balance due and any tip go on 1242.

**Bank deposits** are the Stripe payouts, wires and remote deposits. Each line is commented `M/D/YY: <event>`, and that date is the event date. A 2015 credit is a new deposit; a 1242 credit pays a receivable. Stripe fees sit on 6205 and are outside the recon.

## The coding rule

A payment is a **deposit** (2015) only when its cash reached the bank on or before the event date. From the event date until the payout lands, the amount sits on **1242** until paid. Tripleseat ignores this: it calls any payment taken before the event a deposit, even when the card payout lands after the event. Recode whichever side breaks the rule:

| Found | Recode |
|---|---|
| event entry 2015 line whose payout landed after the event, or has not landed | event entry line to 1242 (the payout then clears it) |
| bank deposit 2015 line paid after its event | bank deposit line to 1242, with the event as its comment |
| bank deposit 1242 line paid on or before its event | bank deposit line to 2015 |

```bash
bash <scripts>/move-line.sh fk je <entry id> "2015 - Event Deposits" debit 22905.49 "Deposit 07/08/26 : Credit Card 2631 Mastercard" "1242 - Tripleseat Receivable"
bash <scripts>/move-line.sh fk bd <entry id> "2015 - Event Deposits" credit 25379.15 "" "1242 - Tripleseat Receivable" "8/28/26: Meredith & Paul Wedding"
```

It opens the entry (the Adjustments tab for a bank deposit), clicks Edit, re-accounts the one line matching account, side, amount and comment, sets the optional new comment, reads the line back, then **Edit Complete** and **Save and Close**. The entry stays Approved. It prints `SAVED <id>`, or `FAIL:` with nothing saved. Recheck with `entries.sh`.

## Setup

R365 is `https://frankiesspuntino.restaurant365.com`, on the same login as dLena (`~/.claude/bowery-credentials.md`). Read [`../bowery-ubereats/R365-AUTOMATION.md`](../bowery-ubereats/R365-AUTOMATION.md) for playwright-cli habits. Work in one scratch directory for the whole run; the scripts write their files there. `<scripts>` is this skill's `scripts/` folder.

```bash
bash <scripts>/r365-login.sh fk
```

The workbook is `c:\Users\trici\OCRA\Frankies Spuntino Group - General\Reports\2026 Frankies 457 Event Deposits & Tripleseat Receivable - Recon.xlsx`. Tabs run newest first, one per week, named for the week's Sunday (`09.27`), plus a month-end tab when the month ends midweek (`07.31`, then `08.02` for 8/1 to 8/2). A week runs Monday to Sunday.

A tab has two lists over rows 5 to the `Total` row:

- deposits in `A:D`: paid date, event date (or `TBD`), name, amount;
- the receivable in `G:I`: event date, name, amount. It starts on the row after the last deposit.

A row cleared during the week keeps its place with its amount moved to `E` (deposits) or `J` (receivable), which keeps it out of the totals. The next week's tab drops it.

## Step 1: the GL and its entries

```bash
bash <scripts>/gl-balances.sh fk 9/21/2026 9/27/2026
bash <scripts>/entries.sh fk $(cut -d'|' -f3 glids.txt | sort -u) > /dev/null
```

`gl-balances.sh` runs GL Account Detail on the System View with exactly 1242 and 2015 ticked and `Show Comment/Location/#` on Full. It writes `glrows.json`, `glbal.txt`, `glids.txt` (ref, type, entry id) and `glbeg.txt` (the opening balances). `glbeg.txt` must equal the prior tab's `D` and `I` totals; stop and report if it differs. `entries.sh` reads every entry's lines through R365's API into `entries.json`; it takes a second per entry.

## Step 2: apply the coding rule

Before planning, check every 2015 line in the week's entries against the coding rule and recode what breaks it. A payout's date is its bank deposit date. A payment with no payout anywhere has not landed. Search every bank deposit line since the payment date, in every account, before concluding that. Then rerun Step 1.

## Step 3: plan the week

```bash
node <scripts>/xlsx-dump.js "<workbook>" > dump.txt
node <scripts>/plan.js dump.txt <prior tab> glrows.json entries.json 9/21/2026 9/27/2026
```

It replays the week's GL lines, day by day, against the prior tab, writes `ops-<M>-<D>.json` per day, and prints each day's tab totals against the GL as `TIES` or `OFF`, plus every `ISSUE`:

- a bank deposit 2015 credit adds a deposit row; one with no event date in its comment goes in as `TBD`;
- an event entry 2015 debit clears the deposit rows it applies, matched by amount and a shared name word, or by several rows summing to the line;
- an event entry 1242 debit adds a receivable row named for the event (`TIP` for a tip line);
- a bank deposit 1242 credit clears the receivable rows it pays. A payment short of its one matching row clears that row and carries the remainder as `<name> - short paid`;
- anything it cannot match goes in as an `UNMATCHED ...` row at the signed amount, so the tab still ties, and prints as an `ISSUE`.

Every day must print `TIES`. An `OFF` day means a line was read wrong; fix the plan before writing the tab.

## Step 4: write the week's tab

Edit only a scratch copy, since the workbook sits in a synced OneDrive folder where AutoSave can land a half-applied edit. Copy the prior tab to the week's name, then apply one op list: `{"op":"purge"}` followed by the week's daily ops in date order.

```bash
cp "<workbook>" work.xlsx
powershell.exe -NoProfile -File "$(cygpath -w <scripts>/new-week-tab.ps1)" -File "$(cygpath -w "$PWD/work.xlsx")" -From "09.20" -Name "09.27"
powershell.exe -NoProfile -File "$(cygpath -w <scripts>/sheet.ps1)" -File "$(cygpath -w "$PWD/work.xlsx")" -Sheet "09.27" -Ops "$(cygpath -w wk.json)"
```

`sheet.ps1` prints the D and I totals; they must equal the GL on the week's last day. Copy `work.xlsx` over the workbook and keep `after-<MMDD>.xlsx` for rollback.

## Step 5: report

```bash
node <scripts>/xlsx-dump.js "<workbook>" > dump.txt
node <scripts>/open-items.js dump.txt 09.27 9/27/2026
```

Report the week's GL balances against the tab, every recode made, every `ISSUE`, and what `open-items.js` lists: deposits whose event has passed (an event entry is missing, or the deposit was booked twice), `TBD` and negative deposits, and open receivables. Then close the browser: `playwright-cli -s=fk close`.

## Rulings

- A payment held between the event and the payout belongs on 1242 (2026-10-04).
- `BlackBird Pizza Series` payments go with the BlackBird Pizza deposits, as `TBD` deposit rows (2026-10-04).
- The human authorized editing approved event entries and bank deposits to apply the coding rule (2026-10-04).

## First run

2026-10-04, 7/1 to 9/27 from the human's 06.30 tab, which tied to the GL (2015 1,223,025.82, 1242 111,143.92). The coding rule recoded 17 event entry lines to 1242 and five bank deposit lines (Nicole Chen and Simpson Thacher to 2015, Meredith & Paul and Leah & Eli 9/1 payouts to 1242, BlackBird Pizza Series to 2015). Every day tied; 9/27 closed at 2015 981,961.64 and 1242 161,392.45. Open at the end: no event entry for the 9/11 Ben & Todd / Welcome Back Ben & Christopher event (deposit 17,719.41, payments 27,752.86), extra payments after the balance (Andrea & Oliver 1,260.00, Stephanie & Will 1,500.00, Jennifer & Scott 2,500.00, Alex & Barbara 3,300.00), Angel & Neha paid 497.67 short, Virginia Gresham's 1,417.55 deposit coded to 1201 Blackbird Receivable (BD004848), and two uncommented transfers (BD004575 29,806.01 on 2015, BD004891 29,497.95 on 1242). Rows carried from before 6/30 still pair a deposit with a receivable of the same amount (Neil & Jenny, Grace & Spencer, Jelena & Paul, Glenda Hersh, Gary Sinise).
